from typing import Dict, Any, List
from api.services.data_service import data_service
from api.utils.logger import get_logger

logger = get_logger("services.dashboard_service")

class DashboardService:
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard data from preprocessed Excel file (cached in session)."""
        kpis = data_service.get_kpis()
        df = data_service.get_dataframe()
        
        # When no data is available or revenue is 0, return all zeros with neutral 0.0% change
        if df.empty or kpis.get("total_revenue", 0) == 0:
            formatted_kpis = [
                {"title": "Total Net Revenue", "value": "$0", "change": "0.0%", "trend": "neutral"},
                {"title": "Total Quantity Sold", "value": "0", "change": "0.0%", "trend": "neutral"},
                {"title": "Gross Margin", "value": "0.0%", "change": "0.0%", "trend": "neutral"},
                {"title": "Active Countries", "value": "0", "change": "0.0%", "trend": "neutral"}
            ]
        else:
            # Calculate changes dynamically if historical periods exist
            rev_change_str = "0.0%"
            rev_trend = "neutral"
            qty_change_str = "0.0%"
            qty_trend = "neutral"
            margin_change_str = "0.0%"
            margin_trend = "neutral"
            country_change_str = "0.0%"
            country_trend = "neutral"

            try:
                sort_cols = []
                if "Year" in df.columns and "MonthNum" in df.columns:
                    sort_cols = ["Year", "MonthNum"]
                elif "OrderDate" in df.columns:
                    sort_cols = ["OrderDate"]
                elif "MonthLabel" in df.columns:
                    sort_cols = ["MonthLabel"]

                if sort_cols:
                    periods = df.groupby(sort_cols).agg(
                        revenue=("NetRevenueUSD", "sum") if "NetRevenueUSD" in df.columns else ("OrderID", "count"),
                        quantity=("Quantity", "sum") if "Quantity" in df.columns else ("OrderID", "count"),
                        margin=("GrossMarginPercent", "mean") if "GrossMarginPercent" in df.columns else ("OrderID", "count"),
                        countries=("Country", "nunique") if "Country" in df.columns else ("OrderID", "count")
                    ).reset_index()

                    if len(periods) >= 2:
                        curr = periods.iloc[-1]
                        prev = periods.iloc[-2]

                        # Revenue change
                        if prev["revenue"] > 0:
                            rev_diff = ((curr["revenue"] - prev["revenue"]) / prev["revenue"]) * 100
                            rev_change_str = f"{'+' if rev_diff > 0 else ''}{rev_diff:.1f}%"
                            rev_trend = "up" if rev_diff > 0 else ("down" if rev_diff < 0 else "neutral")

                        # Quantity change
                        if prev["quantity"] > 0:
                            qty_diff = ((curr["quantity"] - prev["quantity"]) / prev["quantity"]) * 100
                            qty_change_str = f"{'+' if qty_diff > 0 else ''}{qty_diff:.1f}%"
                            qty_trend = "up" if qty_diff > 0 else ("down" if qty_diff < 0 else "neutral")

                        # Margin change
                        margin_diff = curr["margin"] - prev["margin"]
                        margin_change_str = f"{'+' if margin_diff > 0 else ''}{margin_diff:.1f}%"
                        margin_trend = "up" if margin_diff > 0 else ("down" if margin_diff < 0 else "neutral")

                        # Country change
                        country_diff = curr["countries"] - prev["countries"]
                        if prev["countries"] > 0:
                            country_pct = (country_diff / prev["countries"]) * 100
                            country_change_str = f"{'+' if country_pct > 0 else ''}{country_pct:.1f}%"
                            country_trend = "up" if country_pct > 0 else ("down" if country_pct < 0 else "neutral")
            except Exception as e:
                logger.error(f"Error calculating KPI changes: {e}")

            formatted_kpis = [
                {"title": "Total Net Revenue", "value": f"${kpis['total_revenue']:,.0f}", "change": rev_change_str, "trend": rev_trend},
                {"title": "Total Quantity Sold", "value": f"{kpis['total_quantity']:,}", "change": qty_change_str, "trend": qty_trend},
                {"title": "Gross Margin", "value": f"{kpis['avg_margin']:.1f}%", "change": margin_change_str, "trend": margin_trend},
                {"title": "Active Countries", "value": str(kpis['country_count']), "change": country_change_str, "trend": country_trend}
            ]
        
        return {
            "kpis": formatted_kpis,
            "revenue_trend": data_service.get_revenue_trend(),
            "region_breakdown": data_service.get_region_breakdown(),
            "country_breakdown": data_service.get_country_breakdown(),
            "category_breakdown": data_service.get_category_breakdown(),
            "quarterly_performance": data_service.get_quarterly_performance(),
            "top_products": data_service.get_top_products()
        }

dashboard_service = DashboardService()
