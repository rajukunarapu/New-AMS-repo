from pathlib import Path
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

# Directory where this Python file is located
BASE_DIR = Path(__file__).resolve().parent

# Default input file
DEFAULT_INPUT_PATH = (
    BASE_DIR
    / "input"
    / "SAC_Sales_Flat_SingleSheet.xlsx"
)

# Default output file
DEFAULT_OUTPUT_PATH = (
    BASE_DIR
    / "output"
    / "SAC_Sales_Preprocessed.xlsx"
)


# ============================================================
# 1. LOAD DATASET
# ============================================================

def load_dataset(input_path):
    """
    Load the raw Excel dataset.
    """

    print(f"\nLoading dataset from:")
    print(input_path)

    df = pd.read_excel(input_path)

    print(f"\nDataset loaded successfully.")
    print(f"Rows    : {len(df)}")
    print(f"Columns : {len(df.columns)}")

    return df


# ============================================================
# 2. CHECK NULL VALUES
# ============================================================

def check_null_values(df):
    """
    Check for null/missing values in every column.

    This function only reports null values.
    It does not automatically fill or modify them.
    """

    print("\n" + "=" * 60)
    print("NULL VALUE CHECK")
    print("=" * 60)

    null_counts = df.isnull().sum()

    # Keep only columns that contain null values
    columns_with_nulls = null_counts[
        null_counts > 0
    ]

    if columns_with_nulls.empty:
        print("No null values found.")
    else:
        print("Null values found:")
        print(columns_with_nulls)

    return df


# ============================================================
# 3. CHECK AND REMOVE DUPLICATES
# ============================================================

def remove_duplicates(df):
    """
    Check for duplicate rows and remove exact duplicates.
    """

    print("\n" + "=" * 60)
    print("DUPLICATE CHECK")
    print("=" * 60)

    duplicate_count = df.duplicated().sum()

    print(f"Duplicate rows found: {duplicate_count}")

    if duplicate_count > 0:

        # Remove exact duplicate rows
        df = df.drop_duplicates()

        print(
            f"Duplicate rows removed: {duplicate_count}"
        )

    else:
        print("No duplicate rows found.")

    return df


# ============================================================
# 4. CONVERT FINANCIAL COLUMNS TO INTEGER
# ============================================================

def convert_financial_columns(df):
    """
    Convert financial columns into integer values.

    Example:

        8825.58  -> 8825
        1503.90  -> 1503
        5192.58  -> 5192
        22090.88 -> 22090
        13710.36 -> 13710

    Decimal values are truncated using astype(int).

    If your source Excel file contains currency symbols
    such as '$8,825.58', the code also removes '$' and ','.
    """

    financial_columns = [
        "UnitListPriceUSD",
        "NetUnitPriceUSD",
        "NetRevenueUSD",
        "UnitCostUSD",
        "TotalCostUSD",
        "GrossMarginUSD",
        "NetRevenueLocalCurrency"
    ]

    for column in financial_columns:

        if column in df.columns:

            # Convert values to string first.
            # This allows the code to handle values such as:
            # "$8,825.58"
            # "8,825.58"
            df[column] = (
                df[column]
                .astype(str)
                .str.replace("$", "", regex=False)
                .str.replace(",", "", regex=False)
                .str.strip()
            )

            # Convert cleaned values to numeric.
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

            # Convert to integer.
            #
            # Example:
            # 8825.58 -> 8825
            # 1503.90 -> 1503
            df[column] = df[column].fillna(0).astype(int)

    return df


# ============================================================
# 5. CONVERT PERCENTAGE COLUMNS
# ============================================================

def convert_percentage_columns(df):
    """
    Convert percentage columns into readable numeric percentages.

    The uploaded Excel dataset internally stores values like:

        0.0963

    which Excel displays as:

        9.63%

    This function converts:

        0.0963 -> 9.63
        0.0133 -> 1.33
        0.1594 -> 15.94

    If the raw value is already stored as a string such as:

        "9.6%"

    it converts it to:

        9.6
    """

    percentage_columns = [
        "DiscountPercent",
        "GrossMarginPercent"
    ]

    for column in percentage_columns:

        if column in df.columns:

            # Check if the column contains '%' symbols.
            has_percent_symbol = (
                df[column]
                .astype(str)
                .str.contains("%", regex=False)
                .any()
            )

            # Convert to string so we can clean '%' if present.
            df[column] = (
                df[column]
                .astype(str)
                .str.replace("%", "", regex=False)
                .str.strip()
            )

            # Convert to numeric.
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

            # If the original data did not contain '%' symbols,
            # the Excel data is likely stored as decimal fractions.
            #
            # Example:
            # 0.0963 -> 9.63
            # 0.3302 -> 33.02
            if not has_percent_symbol:

                df[column] = df[column] * 100

            # Round to 2 decimal places.
            df[column] = df[column].round(2)

    return df


# ============================================================
# 6. FORMAT ORDER DATE
# ============================================================

def format_order_date(df):
    """
    Format OrderDate as YYYY-MM-DD.

    Instead of:

        2023-01-01 00:00:00

    The output will be:

        2023-01-01

    The date is kept as a date string so the Excel output
    does not display the unwanted time component.
    """

    if "OrderDate" in df.columns:

        # Convert the column to datetime first.
        df["OrderDate"] = pd.to_datetime(
            df["OrderDate"],
            errors="coerce"
        )

        # Format as YYYY-MM-DD.
        df["OrderDate"] = (
            df["OrderDate"]
            .dt.strftime("%Y-%m-%d")
        )

    return df


# ============================================================
# 7. SAVE CLEANED DATASET
# ============================================================

def save_dataset(df, output_path):
    """
    Save the cleaned dataset to an Excel file.
    """

    # Create output directory if it doesn't exist.
    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    # Save dataset.
    df.to_excel(
        output_path,
        index=False
    )

    print("\n" + "=" * 60)
    print("OUTPUT")
    print("=" * 60)

    print(
        f"Cleaned dataset saved successfully at:\n"
        f"{output_path}"
    )


# ============================================================
# 8. MAIN PREPROCESSING PIPELINE
# ============================================================

def preprocess_data(
    input_path=DEFAULT_INPUT_PATH,
    output_path=DEFAULT_OUTPUT_PATH
):
    """
    Execute the complete lightweight preprocessing process.

    Processing steps:

        1. Load Excel dataset
        2. Check null values
        3. Remove duplicate rows
        4. Convert financial columns to integers
        5. Convert percentage columns
        6. Format OrderDate
        7. Save cleaned Excel dataset
    """

    # --------------------------------------------------------
    # Step 1: Load raw dataset
    # --------------------------------------------------------

    df = load_dataset(input_path)

    # --------------------------------------------------------
    # Step 2: Check null values
    # --------------------------------------------------------

    df = check_null_values(df)

    # --------------------------------------------------------
    # Step 3: Remove duplicate records
    # --------------------------------------------------------

    df = remove_duplicates(df)

    # --------------------------------------------------------
    # Step 4: Convert financial columns to integers
    # --------------------------------------------------------

    df = convert_financial_columns(df)

    # --------------------------------------------------------
    # Step 5: Remove '%' and convert percentage values
    # --------------------------------------------------------

    df = convert_percentage_columns(df)

    # --------------------------------------------------------
    # Step 6: Format OrderDate
    # --------------------------------------------------------

    df = format_order_date(df)

    # --------------------------------------------------------
    # Step 7: Save cleaned dataset
    # --------------------------------------------------------

    save_dataset(
        df,
        output_path
    )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("PREPROCESSING COMPLETED")
    print("=" * 60)

    print(f"Final rows    : {len(df)}")
    print(f"Final columns : {len(df.columns)}")

    return df


# ============================================================
# MAIN EXECUTION
# ============================================================

if __name__ == "__main__":

    preprocess_data()