"""
PythonGraphAgent — Custom Graph Generation Service
====================================================
Implements the 10-step Custom Graph Generation workflow:

  Step 3  – Receive natural-language prompt + dataset path
  Step 4  – Read / inspect dataset schema, dtypes, sample values
  Step 5  – AI Agent interprets prompt → chart type, columns, aggregation
  Step 6  – Generate unique temp Python script  (temp_graph_<id>.py)
  Step 7  – Execute script inside venv (60 s timeout)
  Step 8  – Read PNG result → base64 data-URI → return to caller
  Step 9  – Auto-delete temp .py script AND temp .png image
  Step 10 – Each request is fully stateless; no script re-use
"""

import os
import re
import sys
import uuid
import base64
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

from api.services.ai_core_service import ai_core_service
from api.services.excel_dataset_service import excel_dataset_service
from api.utils.logger import get_logger

logger = get_logger("services.python_graph_agent")


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

_CHART_KEYWORDS: Dict[str, str] = {
    "funnel":      "funnel",
    "waterfall":   "waterfall",
    "treemap":     "treemap",
    "tree map":    "treemap",
    "heatmap":     "heatmap",
    "heat map":    "heatmap",
    "correlation": "heatmap",
    "matrix":      "heatmap",
    "stacked":     "stacked_bar",
    "donut":       "donut",
    "doughnut":    "donut",
    "pie":         "pie",
    "violin":      "violin",
    "box":         "box",
    "boxplot":     "box",
    "scatter":     "scatter",
    "bubble":      "scatter",
    "area":        "area",
    "line":        "line",
    "trend":       "line",
    "time series": "line",
    "bar":         "bar",
}

_DIM_KEYWORDS: Dict[str, str] = {
    "category":    "Category",
    "subcategory": "Subcategory",
    "country":     "Country",
    "region":      "Region",
    "segment":     "CustomerSegment",
    "industry":    "IndustryVertical",
    "vertical":    "IndustryVertical",
    "channel":     "Channel",
    "product":     "ProductName",
    "quarter":     "Quarter",
    "month":       "MonthName",
    "sales rep":   "SalesRepName",
    "rep":         "SalesRepName",
}

_MEASURE_KEYWORDS: Dict[str, str] = {
    "margin":   "GrossMarginPercent",
    "profit":   "GrossMarginPercent",
    "quantity": "Quantity",
    "units":    "Quantity",
    "discount": "DiscountPercent",
    "cost":     "TotalCostUSD",
    "price":    "UnitListPriceUSD",
    "revenue":  "NetRevenueUSD",
    "sales":    "NetRevenueUSD",
}


class PythonGraphAgent:
    """Orchestrates the full Custom Graph Generation lifecycle."""

    def __init__(self) -> None:
        self.temp_dir: Path = Path(__file__).resolve().parent / "temp_scripts"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    # ── Step 4: Dataset path & schema ─────────────────────────────────────────

    def _get_dataset_path(self) -> Path:
        try:
            return excel_dataset_service.get_dataset_path()
        except Exception:
            return (
                Path(__file__).resolve().parent.parent.parent
                / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx"
            )

    def _get_schema_summary(self) -> str:
        """Return a rich schema description including sample values."""
        try:
            df = excel_dataset_service.get_df()
            lines: list[str] = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                if df[col].dtype == object:
                    unique_vals = df[col].dropna().unique()[:6].tolist()
                    samples = ", ".join(str(v) for v in unique_vals)
                    lines.append(f"  - {col} [{dtype}] — sample values: {samples}")
                else:
                    mn, mx = df[col].min(), df[col].max()
                    lines.append(f"  - {col} [{dtype}] — range: {mn:.2f} → {mx:.2f}")
            return "\n".join(lines)
        except Exception:
            return (
                "  - NetRevenueUSD [int64]\n"
                "  - Quantity [int64]\n"
                "  - Category [object]\n"
                "  - Subcategory [object]\n"
                "  - Region [object]\n"
                "  - Country [object]\n"
                "  - MonthName [object]\n"
                "  - Quarter [object]\n"
                "  - GrossMarginPercent [float64]\n"
                "  - DiscountPercent [float64]\n"
                "  - TotalCostUSD [int64]\n"
                "  - UnitListPriceUSD [float64]"
            )

    # ── Step 5: Intent parsing (dimension / measure / chart type) ─────────────

    def _infer_chart_type(self, prompt: str) -> str:
        p = prompt.lower()
        for kw, chart in _CHART_KEYWORDS.items():
            if kw in p:
                return chart
        # Heuristics: time words → line, comparison → bar
        if any(w in p for w in ["monthly", "weekly", "daily", "yearly", "over time"]):
            return "line"
        if any(w in p for w in ["compare", "comparison", "vs", "versus", "across"]):
            return "bar"
        if any(w in p for w in ["share", "proportion", "breakdown", "distribution"]):
            return "pie"
        return "bar"

    def _infer_dim(self, prompt: str) -> str:
        p = prompt.lower()
        for kw, col in _DIM_KEYWORDS.items():
            if kw in p:
                return col
        return "Region"

    def _infer_measure(self, prompt: str) -> str:
        p = prompt.lower()
        for kw, col in _MEASURE_KEYWORDS.items():
            if kw in p:
                return col
        return "NetRevenueUSD"

    # ── Step 5: AI system prompt ───────────────────────────────────────────────

    def _build_system_prompt(self, prompt: str, clean_ds: str, clean_output: str) -> str:
        schema = self._get_schema_summary()
        read_stmt = (
            f'pd.read_pickle(r"{clean_ds}")'
            if clean_ds.endswith(".pkl")
            else f'pd.read_excel(r"{clean_ds}")'
        )
        return f"""You are an expert Python Data Visualization Agent for an SAP Analytics Platform.

TASK
----
Generate a complete, executable Python script that produces the requested business visualization.

USER REQUEST
------------
"{prompt}"

DATASET
-------
Path  : r"{clean_ds}"
Read  : df = {read_stmt}

SCHEMA (column [dtype] — sample/range)
---------------------------------------
{schema}

OUTPUT IMAGE
------------
Save the figure to: r"{clean_output}"

STRICT RULES
------------
1. Use ONLY: pandas, matplotlib, seaborn, numpy, openpyxl. No other libraries.
2. Set matplotlib.use('Agg') BEFORE importing pyplot.
3. Validate that required columns exist; raise ValueError with column name if missing.
4. Clean NaN values before aggregating.
5. Use the exact dataset path: r"{clean_ds}"
6. Save with: plt.savefig(r"{clean_output}", format='png', dpi=300, bbox_inches='tight')
7. Close the figure with plt.close() after saving.
8. Use professional styling: seaborn whitegrid theme, readable fonts (size 9–14), grid lines, proper spacing.
9. High resolution: figsize=(10, 6), dpi=300.
10. Return ONLY executable Python code — NO markdown, NO backticks, NO explanations.
11. Do not print anything except: print(r"{clean_output}") at the very end.
12. Do not use network access or read any file except the dataset.
13. If the chart type is not specified, choose the most insightful visualization.
14. Auto-infer x-axis, y-axis, aggregation, labels, legends, title from the user request.
15. Use currency formatting (e.g. $1.23M) for revenue/cost columns automatically.

Generate complete Python code only. No explanation."""

    # ── Step 6: Code generation (AI-first, deterministic fallback) ─────────────

    def _strip_markdown(self, raw: str) -> str:
        code = re.sub(r"```(?:python)?\s*", "", raw, flags=re.IGNORECASE)
        code = re.sub(r"```\s*", "", code)
        return code.strip()

    def _is_valid_code(self, code: str) -> bool:
        return (
            bool(code)
            and "import pandas" in code
            and "plt.savefig" in code
            and "matplotlib.use" in code
        )

    def _generate_python_code(
        self, prompt: str, output_img_path: str, fallback_mode: bool = False
    ) -> str:
        """
        Step 6 — Synthesize a standalone Python visualization script.
        AI-first: calls AI Core LLM. On failure: deterministic template fallback.
        """
        ds_path  = self._get_dataset_path()
        clean_ds = str(ds_path).replace("\\", "/")
        clean_out = str(output_img_path).replace("\\", "/")
        read_stmt = (
            f'df = pd.read_pickle(r"{clean_ds}")'
            if clean_ds.endswith(".pkl")
            else f'df = pd.read_excel(r"{clean_ds}")'
        )

        # ── AI Core attempt ──────────────────────────────────────────────────
        if not fallback_mode:
            try:
                system_prompt = self._build_system_prompt(prompt, clean_ds, clean_out)
                raw = ai_core_service.generate_completion(system_prompt)
                if raw and not raw.startswith(("AI Insight", "Simulated Response")):
                    code = self._strip_markdown(raw)
                    if self._is_valid_code(code):
                        logger.info("[Graph Agent] AI Core generated valid code.")
                        return code
            except Exception as exc:
                logger.warning(f"[Graph Agent] AI Core skipped: {exc}")

        # ── Deterministic fallback ───────────────────────────────────────────
        chart_type = self._infer_chart_type(prompt)
        dim        = self._infer_dim(prompt)
        measure    = self._infer_measure(prompt)
        logger.info(f"[Graph Agent] Deterministic fallback → chart={chart_type}, dim={dim}, measure={measure}")

        return self._deterministic_code(chart_type, dim, measure, clean_ds, clean_out, read_stmt)

    # ── Deterministic code templates ──────────────────────────────────────────

    def _deterministic_code(
        self, chart_type: str, dim: str, measure: str,
        clean_ds: str, clean_out: str, read_stmt: str,
    ) -> str:
        header = f"""import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import numpy as np

sns.set_theme(style="whitegrid", font_scale=1.05)
PALETTE = sns.color_palette("Blues_r", 10)

{read_stmt}

def fmt_val(v, col):
    if col in ("NetRevenueUSD", "TotalCostUSD") and abs(v) >= 1e6:
        return f"${{v/1e6:.2f}}M"
    if col in ("GrossMarginPercent", "DiscountPercent"):
        return f"{{v:.1f}}%"
    return f"{{v:,.0f}}"
"""

        save = f"""
plt.tight_layout()
plt.savefig(r"{clean_out}", format='png', dpi=300, bbox_inches='tight')
plt.close()
print(r"{clean_out}")
"""

        # ── Funnel ────────────────────────────────────────────────────────────
        if chart_type == "funnel":
            return header + f"""
agg = df.groupby("{dim}")["{measure}"].sum().reset_index()
agg = agg.sort_values("{measure}", ascending=False).head(8)
total = agg["{measure}"].sum()
agg["pct"] = agg["{measure}"] / total * 100
max_v = agg["{measure}"].max()

fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
colors = sns.color_palette("Blues_r", len(agg))
for i, row in agg.reset_index(drop=True).iterrows():
    v, pct = row["{measure}"], row["pct"]
    left = (max_v - v) / 2
    y = len(agg) - 1 - i
    ax.barh(y, v, left=left, color=colors[i], edgecolor="#0f172a", linewidth=0.8, height=0.65)
    label = f"{{row['{dim}']}}: {{fmt_val(v, '{measure}')}} ({{pct:.1f}}%)"
    ax.text(left + v / 2, y, label, ha="center", va="center",
            color="white", fontweight="bold", fontsize=8.5)

ax.set_yticks([])
ax.set_xlabel("{measure}", fontsize=11, fontweight="bold", color="#1e293b")
ax.set_title(f"Funnel: {measure} by {dim}", fontsize=14, fontweight="bold", pad=15, color="#0f172a")
for spine in ["top", "right", "left"]:
    ax.spines[spine].set_visible(False)
""" + save

        # ── Heatmap / Correlation ─────────────────────────────────────────────
        if chart_type == "heatmap":
            return header + f"""
num_cols = [c for c in df.columns if df[c].dtype in [np.float64, np.int64]]
corr = df[num_cols].corr()
fig, ax = plt.subplots(figsize=(10, 7), dpi=300)
sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", linewidths=0.5,
            annot_kws={{"size": 8, "weight": "bold"}}, ax=ax)
ax.set_title("Correlation Matrix — Financial & Sales Metrics",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
plt.xticks(rotation=30, ha="right")
plt.yticks(rotation=0)
""" + save

        # ── Stacked Bar ───────────────────────────────────────────────────────
        if chart_type == "stacked_bar":
            sec_dim = "Category" if dim != "Category" else "Region"
            return header + f"""
pivot = df.groupby(["{dim}", "{sec_dim}"])["{measure}"].sum().unstack(fill_value=0)
top_idx = df.groupby("{dim}")["{measure}"].sum().nlargest(8).index
pivot = pivot.loc[pivot.index.isin(top_idx)]

fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
pivot.plot(kind="bar", stacked=True, ax=ax, colormap="tab10",
           edgecolor="#1e293b", linewidth=0.4)
ax.set_title(f"Stacked {measure} by {dim} & {sec_dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("{dim}", fontsize=11, fontweight="bold", color="#334155")
ax.set_ylabel("Total {measure}", fontsize=11, fontweight="bold", color="#334155")
plt.xticks(rotation=30, ha="right")
plt.legend(title="{sec_dim}", bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=8)
""" + save

        # ── Donut / Pie ───────────────────────────────────────────────────────
        if chart_type in ("donut", "pie"):
            wedge = "dict(width=0.42, edgecolor='white')" if chart_type == "donut" else "dict(edgecolor='white')"
            return header + f"""
agg = df.groupby("{dim}")["{measure}"].sum().reset_index()
agg = agg.sort_values("{measure}", ascending=False).head(7)
fig, ax = plt.subplots(figsize=(8, 7), dpi=300)
colors = sns.color_palette("Spectral", len(agg))
wedges, texts, autotexts = ax.pie(
    agg["{measure}"], labels=agg["{dim}"],
    autopct="%1.1f%%", startangle=140,
    colors=colors, wedgeprops={wedge},
    textprops={{"fontsize": 9, "weight": "bold"}}
)
for at in autotexts:
    at.set_fontsize(8)
ax.set_title(f"Share of {measure} by {dim}",
             fontsize=14, fontweight="bold", pad=20, color="#0f172a")
""" + save

        # ── Line / Area ───────────────────────────────────────────────────────
        if chart_type in ("line", "area"):
            t_dim = "Quarter" if "quarter" in dim.lower() else "MonthName"
            fill = f"ax.fill_between(range(len(agg)), agg['{measure}'], color='#38bdf8', alpha=0.3)" if chart_type == "area" else ""
            return header + f"""
agg = df.groupby("{t_dim}")["{measure}"].sum().reset_index()
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
ax.plot(agg["{t_dim}"].astype(str), agg["{measure}"],
        marker="o", linewidth=2.5, color="#0284c7",
        markerfacecolor="#0369a1", markersize=6)
{fill}
ax.set_title(f"Trend: {measure} across {t_dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("{t_dim}", fontsize=11, fontweight="bold", color="#334155")
ax.set_ylabel("{measure}", fontsize=11, fontweight="bold", color="#334155")
plt.xticks(rotation=20, ha="right")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(
    lambda x, _: f"${{x/1e6:.1f}}M" if "{measure}" in ("NetRevenueUSD", "TotalCostUSD") and x >= 1e6 else f"{{x:,.0f}}"
))
""" + save

        # ── Waterfall ─────────────────────────────────────────────────────────
        if chart_type == "waterfall":
            return header + f"""
agg = df.groupby("{dim}")["{measure}"].sum().reset_index()
agg = agg.sort_values("{measure}", ascending=False).head(8)
agg["cumulative"] = agg["{measure}"].cumsum()
bottoms = [0] + list(agg["cumulative"].iloc[:-1])

fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
colors = sns.color_palette("viridis", len(agg))
bars = ax.bar(agg["{dim}"].astype(str), agg["{measure}"],
              bottom=bottoms, color=colors, edgecolor="#0f172a", linewidth=0.7)
ax.set_title(f"Waterfall: Cumulative {measure} by {dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("{dim}", fontsize=11, fontweight="bold", color="#334155")
ax.set_ylabel("Cumulative {measure}", fontsize=11, fontweight="bold", color="#334155")
plt.xticks(rotation=30, ha="right")
for bar, b in zip(bars, bottoms):
    h = bar.get_height()
    ax.annotate(fmt_val(h, "{measure}"),
                xy=(bar.get_x() + bar.get_width()/2, b + h),
                xytext=(0, 4), textcoords="offset points",
                ha="center", va="bottom", fontsize=7.5, fontweight="bold")
""" + save

        # ── Treemap (horizontal bar substitute) ───────────────────────────────
        if chart_type == "treemap":
            return header + f"""
agg = df.groupby("{dim}")["{measure}"].sum().reset_index()
agg = agg.sort_values("{measure}", ascending=False).head(10)
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
colors = sns.color_palette("crest", len(agg))
bars = ax.barh(agg["{dim}"].astype(str), agg["{measure}"],
               color=colors, edgecolor="#0f172a", linewidth=0.6)
ax.set_title(f"Category Hierarchy: {measure} by {dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("Total {measure}", fontsize=11, fontweight="bold", color="#334155")
for bar in bars:
    w = bar.get_width()
    ax.text(w * 0.98, bar.get_y() + bar.get_height()/2,
            fmt_val(w, "{measure}"), ha="right", va="center",
            color="white", fontsize=8, fontweight="bold")
ax.invert_yaxis()
""" + save

        # ── Box / Violin ──────────────────────────────────────────────────────
        if chart_type in ("box", "violin"):
            plot_fn = "sns.violinplot" if chart_type == "violin" else "sns.boxplot"
            return header + f"""
top_dims = df["{dim}"].value_counts().head(8).index
sub = df[df["{dim}"].isin(top_dims)]
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
{plot_fn}(data=sub, x="{dim}", y="{measure}", ax=ax, palette="Set2")
ax.set_title(f"Distribution of {measure} by {dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("{dim}", fontsize=11, fontweight="bold", color="#334155")
ax.set_ylabel("{measure}", fontsize=11, fontweight="bold", color="#334155")
plt.xticks(rotation=30, ha="right")
""" + save

        # ── Scatter ───────────────────────────────────────────────────────────
        if chart_type == "scatter":
            sec = "DiscountPercent" if measure != "DiscountPercent" else "GrossMarginPercent"
            return header + f"""
sample = df.sample(n=min(1200, len(df)), random_state=42)
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
sns.scatterplot(data=sample, x="{sec}", y="{measure}",
                hue="{dim}", alpha=0.72, s=45, ax=ax, palette="tab10")
ax.set_title(f"Scatter: {sec} vs {measure}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
plt.legend(bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=8)
""" + save

        # ── Default: Bar chart ─────────────────────────────────────────────────
        return header + f"""
agg = df.groupby("{dim}")["{measure}"].sum().reset_index()
agg = agg.sort_values("{measure}", ascending=False).head(10)
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
colors = sns.color_palette("Blues_r", len(agg))
bars = ax.bar(agg["{dim}"].astype(str), agg["{measure}"],
              color=colors, edgecolor="#0f172a", linewidth=0.7, alpha=0.92)
ax.set_title(f"Total {measure} by {dim}",
             fontsize=14, fontweight="bold", pad=15, color="#0f172a")
ax.set_xlabel("{dim}", fontsize=11, fontweight="bold", color="#334155")
ax.set_ylabel("Total {measure}", fontsize=11, fontweight="bold", color="#334155")
plt.xticks(rotation=30, ha="right")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(
    lambda x, _: f"${{x/1e6:.1f}}M" if "{measure}" in ("NetRevenueUSD", "TotalCostUSD") and x >= 1e6 else f"{{x:,.0f}}"
))
for bar in bars:
    h = bar.get_height()
    ax.annotate(fmt_val(h, "{measure}"),
                xy=(bar.get_x() + bar.get_width()/2, h),
                xytext=(0, 4), textcoords="offset points",
                ha="center", va="bottom", fontsize=7.5, fontweight="bold")
""" + save

    # ── Step 7: venv-aware Python executable ──────────────────────────────────

    def _get_python_executable(self) -> str:
        venv_py = Path(__file__).resolve().parent.parent.parent / "venv" / "Scripts" / "python.exe"
        if venv_py.exists():
            logger.debug(f"[Graph Agent] Using venv Python: {venv_py}")
            return str(venv_py)
        logger.debug(f"[Graph Agent] venv not found, falling back to: {sys.executable}")
        return sys.executable

    # ── Step 8 + cleanup insights ─────────────────────────────────────────────

    def _build_insights(self, prompt: str, chart_type: str, dim: str, measure: str, script_name: str) -> str:
        chart_label = chart_type.replace("_", " ").title()
        return (
            f"• **AI Graph Agent** generated a **{chart_label} Chart** for your request.\n"
            f"• Visualizing **{measure}** grouped by **{dim}**.\n"
            f"• Dataset: `SAC_Sales_Preprocessed` — temp script `{script_name}` auto-deleted after execution."
        )

    # ── Step 3–10: Main entry point ───────────────────────────────────────────

    def generate_custom_graph(self, prompt: str) -> Dict[str, Any]:
        """
        Full 10-step Custom Graph Generation workflow.
        Returns a dict with: status, prompt, image_base64, chart_type, insights, message.
        """
        logger.info(f"[Graph Agent] Received request: '{prompt}'")

        script_id       = uuid.uuid4().hex[:10]
        temp_script     = self.temp_dir / f"temp_graph_{script_id}.py"
        temp_image      = self.temp_dir / f"temp_graph_{script_id}.png"
        python_exe      = self._get_python_executable()

        # Intent inference (used in fallback + insights)
        chart_type = self._infer_chart_type(prompt)
        dim        = self._infer_dim(prompt)
        measure    = self._infer_measure(prompt)

        try:
            # ── Step 6a: AI-first code generation ─────────────────────────────
            py_code = self._generate_python_code(prompt, str(temp_image), fallback_mode=False)

            with open(temp_script, "w", encoding="utf-8") as fh:
                fh.write(py_code)
            logger.info(f"[Graph Agent] Temp script written: {temp_script.name}")

            # ── Step 7a: Execute ───────────────────────────────────────────────
            proc = subprocess.run(
                [python_exe, str(temp_script)],
                capture_output=True, text=True, timeout=60,
            )

            # ── Step 6b / 7b: Deterministic fallback on execution failure ──────
            if proc.returncode != 0:
                logger.warning(
                    f"[Graph Agent] Attempt 1 failed (rc={proc.returncode}). "
                    f"Error snippet: {proc.stderr[:200]}"
                )
                fallback_code = self._generate_python_code(prompt, str(temp_image), fallback_mode=True)
                with open(temp_script, "w", encoding="utf-8") as fh:
                    fh.write(fallback_code)

                proc = subprocess.run(
                    [python_exe, str(temp_script)],
                    capture_output=True, text=True, timeout=60,
                )

            # ── Execution error after both attempts ───────────────────────────
            if proc.returncode != 0:
                logger.error(f"[Graph Agent] Both attempts failed.\nSTDERR:\n{proc.stderr}")
                return {
                    "status": "error",
                    "prompt": prompt,
                    "image_base64": "",
                    "chart_type": chart_type,
                    "insights": "",
                    "message": f"Graph execution failed after retry: {proc.stderr[:300]}",
                }

            # ── Step 8: Verify image was produced ────────────────────────────
            if not temp_image.exists():
                logger.error("[Graph Agent] Execution succeeded but no image was produced.")
                return {
                    "status": "error",
                    "prompt": prompt,
                    "image_base64": "",
                    "chart_type": chart_type,
                    "insights": "",
                    "message": "Graph image was not created by the script.",
                }

            # ── Step 8: Encode to base64 data-URI ────────────────────────────
            with open(temp_image, "rb") as img_fh:
                img_b64 = base64.b64encode(img_fh.read()).decode("utf-8")

            data_uri = f"data:image/png;base64,{img_b64}"
            insights = self._build_insights(prompt, chart_type, dim, measure, temp_script.name)

            logger.info(f"[Graph Agent] Successfully generated visualization for '{prompt}'.")
            return {
                "status":       "success",
                "prompt":       prompt,
                "image_base64": data_uri,
                "chart_type":   chart_type,
                "insights":     insights,
                "message":      f"Successfully generated {chart_type.replace('_', ' ')} chart for '{prompt}'.",
            }

        except subprocess.TimeoutExpired:
            logger.error("[Graph Agent] Script execution timed out (>60 s).")
            return {
                "status": "error",
                "prompt": prompt,
                "image_base64": "",
                "chart_type": chart_type,
                "insights": "",
                "message": "Graph generation timed out. Try a simpler request.",
            }
        except Exception as exc:
            logger.error(f"[Graph Agent] Pipeline error: {exc}")
            return {
                "status": "error",
                "prompt": prompt,
                "image_base64": "",
                "chart_type": chart_type,
                "insights": "",
                "message": f"Dynamic graph error: {exc}",
            }
        finally:
            # ── Step 9: Auto-delete temp script & temp image ──────────────────
            for fpath in (temp_script, temp_image):
                if fpath.exists():
                    try:
                        os.remove(fpath)
                        logger.info(f"[Cleanup] Deleted: {fpath.name}")
                    except Exception as ex:
                        logger.warning(f"[Cleanup] Could not delete {fpath.name}: {ex}")


python_graph_agent = PythonGraphAgent()
