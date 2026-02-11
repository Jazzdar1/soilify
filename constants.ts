import { Product, Order } from './types';

// Use a reliable placeholder logo
export const BRAND_LOGO_URL = 'https://placehold.co/400x400/22c55e/ffffff?text=Soilify'; 
export const BRAND_NAME = 'Soilify Kashmir';

export const CATEGORIES = ['All', 'Fertilizers', 'Seeds', 'Bio-Control', 'Tools', 'Equipment'];

// FIXED: Used placehold.co to prevent network timeouts
const IMAGES = {
  vermicompost: 'https://placehold.co/600x400/3f3f46/ffffff?text=Vermicompost',
  seeds: 'https://placehold.co/600x400/dc2626/ffffff?text=Apple+Seeds',
  worms: 'https://placehold.co/600x400/ea580c/ffffff?text=Earthworms',
  tools: 'https://placehold.co/600x400/475569/ffffff?text=Farm+Tools',
  bio: 'https://placehold.co/600x400/16a34a/ffffff?text=Bio+Control'
};

// FIXED: Changed IDs to real UUIDs to fix Supabase "400" error
export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // UUID
    name: 'Premium Grade Vermicompost (Black Gold)', 
    price: 450, 
    unit: '50kg Bag', 
    category: 'Fertilizers', 
    image: IMAGES.vermicompost, 
    description: 'Our signature organic fertilizer. Enriched with micronutrients specifically for Kashmiri apple orchards.', 
    rating: 4.9, 
    reviews: 1240, 
    inStock: true, 
    stockCount: 500 
  },
  { 
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
    name: 'Soilify Hybrid Apple Seeds - Gala Variant', 
    price: 1250, 
    unit: 'Packet', 
    category: 'Seeds', 
    image: IMAGES.seeds, 
    description: 'High-altitude optimized apple seeds. Resistant to local pests.', 
    rating: 4.7, 
    reviews: 856, 
    inStock: true, 
    stockCount: 200 
  },
  { 
    id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 
    name: 'Red Wiggler Composting Worms (Live)', 
    price: 800, 
    unit: '1kg Starter Kit', 
    category: 'Bio-Control', 
    image: IMAGES.worms, 
    description: 'Eisenia Fetida worms for home and farm composting units.', 
    rating: 4.8, 
    reviews: 432, 
    inStock: true, 
    stockCount: 50 
  },
  // Generated items with random UUIDs
  ...Array.from({ length: 5 }).map((_, i) => { 
    return {
      id: `d${i}eebc99-9c0b-4ef8-bb6d-6bb9bd380a1${i}`,
      name: ['Eco-Friendly Potash', 'Hand Trowel', 'Neem Oil', 'Pruning Shears', 'Drip Kit'][i],
      price: 100 + (i * 50),
      unit: 'Unit',
      category: 'Tools',
      image: IMAGES.tools,
      description: 'High-quality farming tool.',
      rating: 4.5,
      reviews: 50,
      inStock: true,
      stockCount: 20
    };
  })
];

export const INITIAL_ORDERS: Order[] = [
  { 
    id: 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 
    farmerName: 'Bashir Ahmed', 
    phone: '+91 9906012345', 
    product: 'Premium Vermicompost', 
    quantity: 10, 
    totalPrice: 4500, 
    status: 'Payment Verified', 
    paymentStatus: 'Verified',
    paymentMethod: 'Marketplace',
    location: 'Shopian', 
    date: '2024-05-22', 
    type: 'Marketplace' 
  },
];