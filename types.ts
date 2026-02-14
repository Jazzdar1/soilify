export enum AppView {
  FARMER = 'FARMER',
  ADMIN = 'ADMIN'
}

export enum FarmerTab {
  SHOP = 'SHOP',
  ORDERS = 'ORDERS',
  WHATSAPP = 'WHATSAPP'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  unit: string;
  category: string;
  image: string;
  description: string;
  brand?: string;
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
  user_id?: string; // Critical for linking
  farmerName: string;
  phone: string;
  email?: string;
  product: string;
  quantity: number;
  totalPrice: number;
  status: 'Pending' | 'Approved' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Rejected' | 'Return Requested' | 'Refunded';
  paymentStatus: 'Awaiting' | 'Paid' | 'Failed' | 'Refund Requested' | 'Refunded';
  paymentMethod: string;
  location: string;
  district?: string;
  nearby?: string;
  pincode?: string;
  date: string;
  pickupDate?: string;
  deliveryDate?: string;
  trackingId?: string;
  shippedDate?: string;
  deliveredDate?: string;
  rejectionReason?: string;
  returnReason?: string;
  userRating?: number;
  userReview?: string;
  type?: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isLoggedIn: boolean;
}