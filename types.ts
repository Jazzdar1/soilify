export enum AppView {
  FARMER = 'FARMER',
  ADMIN = 'ADMIN'
}

export enum FarmerTab {
  SHOP = 'SHOP',
  EXPERT = 'EXPERT',
  WHATSAPP = 'WHATSAPP',
  ORDERS = 'ORDERS'
}

export enum WhatsAppState {
  START = 'START',
  LANGUAGE = 'LANGUAGE',
  LOCATION = 'LOCATION',
  MENU = 'MENU',
  PRODUCT_LIST = 'PRODUCT_LIST',
  QUANTITY = 'QUANTITY',
  ADDRESS = 'ADDRESS',
  PAYMENT = 'PAYMENT',
  CONFIRMED = 'CONFIRMED'
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  isLoggedIn: boolean;
  role?: 'admin' | 'farmer';
}

export interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  type: 'text' | 'options' | 'audio' | 'order_card';
  options?: string[];
  audioUrl?: string;
  payload?: any;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  stockCount: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  farmerName: string;
  phone: string;
  product: string; // Comma separated string of product names
  quantity: number;
  totalPrice: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Payment Verified' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Awaiting' | 'Verified' | 'Refunded';
  paymentMethod: string;
  location: string;
  date: string;
  type: 'Marketplace' | 'WhatsApp' | 'Voice';
  rejectionReason?: string;
  trackingId?: string;
}