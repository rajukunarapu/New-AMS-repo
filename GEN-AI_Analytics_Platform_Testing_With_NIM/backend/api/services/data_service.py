"""
Data Service for reading KPIs from preprocessed Excel file with session caching.
"""
import os
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from api.utils.logger import get_logger

logger = get_logger("services.data_service")

class DataService:
    """Service to load and cache data from preprocessed Excel file."""
    
    _instance = None
    _cache = None
    _df = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._df is None:
            self._load_data()
    
    def _load_data(self):
        """Load data from preprocessed Excel file."""
        try:
            from api.services.excel_dataset_service import excel_dataset_service
            self._df = excel_dataset_service.get_df()
            logger.info(f"Data loaded successfully from excel_dataset_service. Shape: {self._df.shape}")
        except Exception as e:
            logger.error(f"Error loading data from Excel: {e}")
            self._df = pd.DataFrame()
    
    def get_dataframe(self) -> pd.DataFrame:
        """Get the cached dataframe."""
        if self._df is None or self._df.empty:
            self._load_data()
        return self._df
    
    def get_kpis(self) -> Dict[str, Any]:
        """Calculate KPIs from the cached data."""
        df = self.get_dataframe()
        
        if df.empty:
            logger.warning("No data available, returning default KPIs")
            return {
                "total_revenue": 0,
                "total_quantity": 0,
                "avg_margin": 0,
                "country_count": 0
            }
        
        try:
            total_revenue = df["NetRevenueUSD"].sum()
            total_quantity = df["Quantity"].sum()
            avg_margin = df["GrossMarginPercent"].mean()
            country_count = df["Country"].nunique()
            
            return {
                "total_revenue": float(total_revenue),
                "total_quantity": int(total_quantity),
                "avg_margin": float(avg_margin),
                "country_count": int(country_count)
            }
        except Exception as e:
            logger.error(f"Error calculating KPIs: {e}")
            return {
                "total_revenue": 0,
                "total_quantity": 0,
                "avg_margin": 0,
                "country_count": 0
            }
    
    def get_revenue_trend(self) -> List[Dict[str, Any]]:
        """Get monthly revenue trend."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            # Group by MonthLabel and calculate revenue and profit
            trend = df.groupby("MonthLabel").agg(
                revenue=("NetRevenueUSD", "sum"),
                profit=("GrossMarginUSD", "sum")
            ).reset_index()
            
            # Sort by MonthLabel
            trend = trend.sort_values("MonthLabel")
            
            # Format for frontend
            result = []
            for _, row in trend.iterrows():
                result.append({
                    "month": row["MonthLabel"],
                    "revenue": float(row["revenue"]),
                    "profit": float(row["profit"])
                })
            
            return result
        except Exception as e:
            logger.error(f"Error getting revenue trend: {e}")
            return []
    
    def get_region_breakdown(self) -> List[Dict[str, Any]]:
        """Get revenue breakdown by region."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            region_data = df.groupby("Region").agg(
                revenue=("NetRevenueUSD", "sum")
            ).reset_index()
            
            total_revenue = region_data["revenue"].sum()
            region_data["share"] = (region_data["revenue"] / total_revenue * 100).round(1)
            
            result = []
            for _, row in region_data.iterrows():
                result.append({
                    "region": row["Region"],
                    "revenue": float(row["revenue"]),
                    "share": float(row["share"])
                })
            
            return sorted(result, key=lambda x: x["revenue"], reverse=True)
        except Exception as e:
            logger.error(f"Error getting region breakdown: {e}")
            return []
    
    def get_country_breakdown(self) -> List[Dict[str, Any]]:
        """Get revenue breakdown by country."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            country_data = df.groupby("Country").agg(
                revenue=("NetRevenueUSD", "sum")
            ).reset_index()
            
            country_data = country_data.sort_values("revenue", ascending=False).head(10)
            
            result = []
            for _, row in country_data.iterrows():
                result.append({
                    "country": row["Country"],
                    "revenue": float(row["revenue"])
                })
            
            return result
        except Exception as e:
            logger.error(f"Error getting country breakdown: {e}")
            return []
    
    def get_category_breakdown(self) -> List[Dict[str, Any]]:
        """Get revenue breakdown by category."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            category_data = df.groupby("Category").agg(
                revenue=("NetRevenueUSD", "sum")
            ).reset_index()
            
            category_data = category_data.sort_values("revenue", ascending=False)
            
            result = []
            for _, row in category_data.iterrows():
                result.append({
                    "category": row["Category"],
                    "revenue": float(row["revenue"])
                })
            
            return result
        except Exception as e:
            logger.error(f"Error getting category breakdown: {e}")
            return []
    
    def get_quarterly_performance(self) -> List[Dict[str, Any]]:
        """Get quarterly performance (target vs actual)."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            quarterly = df.groupby(["Year", "Quarter"]).agg(
                actual=("NetRevenueUSD", "sum")
            ).reset_index()
            
            quarterly["quarter_label"] = quarterly["Year"].astype(str) + " " + quarterly["Quarter"]
            quarterly = quarterly.sort_values(["Year", "Quarter"])
            
            # Set target as 90% of actual for visualization
            quarterly["target"] = (quarterly["actual"] * 0.9).round(0)
            
            result = []
            for _, row in quarterly.iterrows():
                result.append({
                    "quarter": row["quarter_label"],
                    "target": float(row["target"]),
                    "actual": float(row["actual"])
                })
            
            return result
        except Exception as e:
            logger.error(f"Error getting quarterly performance: {e}")
            return []
    
    def get_top_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top products by revenue."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            product_data = df.groupby(["ProductID", "ProductName"]).agg(
                units=("Quantity", "sum"),
                revenue=("NetRevenueUSD", "sum")
            ).reset_index()
            
            product_data = product_data.sort_values("revenue", ascending=False).head(limit)
            
            result = []
            for _, row in product_data.iterrows():
                result.append({
                    "product": row["ProductName"],
                    "units": int(row["units"]),
                    "revenue": float(row["revenue"])
                })
            
            return result
        except Exception as e:
            logger.error(f"Error getting top products: {e}")
            return []
    
    def get_order_ids(self, limit: int = 100) -> List[str]:
        """Get list of OrderIDs."""
        df = self.get_dataframe()
        
        if df.empty:
            return []
        
        try:
            order_ids = df["OrderID"].unique()[:limit]
            return order_ids.tolist()
        except Exception as e:
            logger.error(f"Error getting order IDs: {e}")
            return []
    
    def get_order_details(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific order ID."""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        try:
            order_data = df[df["OrderID"] == order_id]
            if order_data.empty:
                return None
            
            row = order_data.iloc[0]
            return row.to_dict()
        except Exception as e:
            logger.error(f"Error getting order details: {e}")
            return None


# Singleton instance
data_service = DataService()