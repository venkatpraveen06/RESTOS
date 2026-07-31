from pydantic import BaseModel
from typing import List, Optional

class MenuItemBase(BaseModel):
    name: str
    category: str
    price: float
    discount: Optional[float] = 0.0
    description: Optional[str] = None
    is_veg: bool = True
    is_popular: bool = False
    prep_time: Optional[str] = "15 mins"
    image: Optional[str] = None
    available: bool = True

class MenuItemCreate(MenuItemBase):
    id: str

class MenuItemResponse(MenuItemBase):
    id: str
    rating: float

    class Config:
        from_attributes = True

class OrderItemSchema(BaseModel):
    item_id: str
    item_name: str
    qty: int
    price: float

class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    order_type: str = "delivery"
    table_no: Optional[str] = None
    address: Optional[str] = None
    items: List[OrderItemSchema]
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    customer_name: str
    phone: str
    order_type: str
    subtotal: float
    tax: float
    total: float
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    role: str
