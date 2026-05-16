import { Warehouse, MapPin, Package, Layers, Users, ClipboardList, CheckSquare, History } from 'lucide-react';
import type { ColumnDef } from '../types';

export const TAB_ICONS: Record<string, any> = {
  Chambers: Warehouse,
  Locations: MapPin,
  Products: Package,
  Stocks: Layers,
  Users: Users,
  PickLists: ClipboardList,
  Tasks: CheckSquare, 
  Transactions: History
};

export const SCHEMAS: Record<string, ColumnDef[]> = {
  Chambers: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' }
  ],
  Locations: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Code' },
    { key: 'chamberId', label: 'Chamber ID' }
  ],
  Products: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'pickFaceLocationId', label: 'PickFace Location ID' },
    { key: 'fullPalletQnt', label: 'Full Pallet Qnt' },
    { key: 'unitOfMeasurement', label: 'UOM' }
  ],
  Stocks: [
    { key: 'id', label: 'ID' },
    { key: 'productId', label: 'Product ID' },
    { key: 'locationId', label: 'Location ID' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'palletRef', label: 'Pallet Ref' },
    { key: 'status', label: 'Status' },
    { key: 'pickListId', label: 'PickList ID' },
    { key: 'holdReason', label: 'Hold Reason' }
  ],
  Users: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' }
  ],
  PickLists: [
    { key: 'id', label: 'ID' },
    { key: 'ref', label: 'Ref' },
    { key: 'dispatchDate', label: 'Dispatch Date' }
  ],
  Tasks: [
    { key: 'id', label: 'ID' },
    { key: 'stockId', label: 'Stock ID' },
    { key: 'locationToId', label: 'Location To ID' },
    { key: 'palletRefTo', label: 'Pallet Ref To' },
    { key: 'pickListId', label: 'PickList ID' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'assignedUserId', label: 'Assigned User ID' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'completedAt', label: 'Completed At' }
  ],
  Transactions: [
    { key: "id", label: "Transaction ID" },
    { key: "stockId", label: "Stock ID" },
    { key: "locationFromId", label: "Location From ID" }, // <-- Added
    { key: "locationToId", label: "Location To ID" },
    { key: "palletRefFrom", label: "Pallet Ref From" },   // <-- Added
    { key: "palletRefTo", label: "New Pallet Ref" },
    { key: "pickListId", label: "PickList ID" },
    { key: "quantity", label: "Quantity" },
    { key: "type", label: "Transaction Type" },
    { key: "completedByUser", label: "Completed By User ID" }
  ]
};

export const VIEW_SCHEMAS: Record<string, ColumnDef[]> = {
  Chambers: SCHEMAS.Chambers,
  Locations: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Code' },
    { key: 'chamber', label: 'Chamber', targetTab: 'Chambers', targetIdKey: 'chamberId' }
  ],
  Products: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'pickFaceLocation', label: 'Pickface Location', targetTab: 'Locations', targetIdKey: 'pickFaceLocationId' },
    { key: 'fullPalletQnt', label: 'Full Pallet Qnt' },
    { key: 'unitOfMeasurement', label: 'UOM' }
  ],
  Stocks: [
    { key: 'id', label: 'ID' },
    { key: 'productCode', label: 'Product Code', targetTab: 'Products', targetIdKey: 'productId' },
    { key: 'productDescription', label: 'Product Description', targetTab: 'Products', targetIdKey: 'productId' },
    { key: 'location', label: 'Location', targetTab: 'Locations', targetIdKey: 'locationId' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'palletRef', label: 'Pallet Ref' },
    { key: 'status', label: 'Status' },
    { key: 'pickList', label: 'PickList Ref', targetTab: 'PickLists', targetIdKey: 'pickListId' },
    { key: 'holdReason', label: 'Hold Reason' }
  ],
  Users: SCHEMAS.Users,
  PickLists: SCHEMAS.PickLists,
  Tasks: [
    { key: 'id', label: 'ID' },
    { key: 'productCode', label: 'Product Code', targetTab: 'Products', targetIdKey: '_productId' },
    { key: 'productDescription', label: 'Product Description', targetTab: 'Products', targetIdKey: '_productId' },
    { key: 'locationFrom', label: 'Location From', targetTab: 'Locations', targetIdKey: '_locationFromId' },
    { key: 'locationTo', label: 'Location To', targetTab: 'Locations', targetIdKey: 'locationToId' },
    { key: 'palletRefFrom', label: 'Pallet Ref From', targetTab: 'Stocks', targetIdKey: 'stockId' },
    { key: 'palletRefTo', label: 'Pallet Ref To' },
    { key: 'pickList', label: 'PickList Ref', targetTab: 'PickLists', targetIdKey: '_pickListIdToUse' },
    { key: 'dispatchDate', label: 'Dispatch Date', targetTab: 'PickLists', targetIdKey: '_pickListIdToUse' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'assignedUser', label: 'Assigned User', targetTab: 'Users', targetIdKey: 'assignedUserId' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'completedAt', label: 'Completed At' }
  ],
  Transactions: [
    { key: "id", label: "ID" },
    { key: "productCode", label: "Product Code", targetTab: "Products", targetIdKey: "_productId" },
    { key: "productDescription", label: "Product Description" },
    { key: "locationFrom", label: "Location From", targetTab: "Locations", targetIdKey: "_locationFromId" },
    { key: "locationTo", label: "Location To", targetTab: "Locations", targetIdKey: "_locationToId" },
    { key: "palletRefFrom", label: "Pallet Ref From" },
    { key: "palletRefTo", label: "Pallet Ref To" },
    { key: "quantity", label: "Quantity" },
    { key: "type", label: "Type" },
    { key: "completedByUser", label: "Completed By", targetTab: "Users", targetIdKey: "_completedByUser" },
    { key: "createdAt", label: "Created At" }
  ]
};

export const getEnumOptions = (tab: string, key: string) => {
  if (key === 'unitOfMeasurement') return ["kg", "case"];
  
  // Updated User Roles
  if (key === 'role') return ["Operative", "Admin"]; 
  if (key === 'shift') return ["Early", "Late"]; 
  
  if (key === 'holdReason') return ["QCHold", "PalletMissing"];
  
  if (key === 'status') {
    // Added "Received"
    if (tab === 'Stocks') return ["Received", "Available", "Allocated", "Picked", "Hold"]; 
    if (tab === 'Tasks') return ["Allocated", "Completed"];
  }
  
  if (key === 'type') {
    if (tab === 'Tasks') return ["Pick", "Replenishment", "Load", "Dispatch"];
    // Updated to match your exact DB ENUMs!
    if (tab === 'Transactions') return ["Received", "Put Away", "Picked", "Replenished", "Loaded", "Dispatched"];
  }
  return null;
};