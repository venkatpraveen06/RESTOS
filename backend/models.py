from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="customer") # admin, kitchen, customer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    is_veg = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    prep_time = Column(String, default="15 mins")
    rating = Column(Float, default=4.8)
    image = Column(String, nullable=True)
    available = Column(Boolean, default=True)

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    order_type = Column(String, default="dine-in") # dine-in, takeaway, delivery
    table_no = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    delivery_fee = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    status = Column(String, default="incoming") # incoming, accepted, preparing, ready, completed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"))
    item_id = Column(String, ForeignKey("menu_items.id"))
    item_name = Column(String, nullable=False)
    qty = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(String, primary_key=True, index=True)
    guest_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    guests = Column(Integer, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    table_allocated = Column(String, default="Pending")
    status = Column(String, default="Confirmed")
    special_request = Column(Text, nullable=True)
