-- Seed demo data for PLM Demo
-- Uses existing plm-demo tenant and Product Loader actor

-- Tenant ID: 019bae6d-b0e2-3790-8b1d-007fc3bee890
-- Actor ID: 019bae6d-b0e5-4abc-8f9f-00415fda79aa

-- Products
INSERT INTO entities (tenant_id, type_path, properties, created_by)
VALUES
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'product',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Circuit Board A1"}}, "sku": {"source": "literal", "value": {"type": "text", "value": "PCB-001"}}, "price": {"source": "literal", "value": {"type": "number", "value": 45.99}}, "status": {"source": "literal", "value": {"type": "text", "value": "active"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'product',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Power Supply Unit"}}, "sku": {"source": "literal", "value": {"type": "text", "value": "PSU-002"}}, "price": {"source": "literal", "value": {"type": "number", "value": 89.99}}, "status": {"source": "literal", "value": {"type": "text", "value": "active"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'product',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Aluminum Housing"}}, "sku": {"source": "literal", "value": {"type": "text", "value": "HSG-003"}}, "price": {"source": "literal", "value": {"type": "number", "value": 124.50}}, "status": {"source": "literal", "value": {"type": "text", "value": "active"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'product',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Copper Wire Spool"}}, "sku": {"source": "literal", "value": {"type": "text", "value": "CWS-004"}}, "price": {"source": "literal", "value": {"type": "number", "value": 32.00}}, "status": {"source": "literal", "value": {"type": "text", "value": "draft"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'product',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Steel Bracket Set"}}, "sku": {"source": "literal", "value": {"type": "text", "value": "SBS-005"}}, "price": {"source": "literal", "value": {"type": "number", "value": 18.75}}, "status": {"source": "literal", "value": {"type": "text", "value": "active"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa');

-- Categories
INSERT INTO entities (tenant_id, type_path, properties, created_by)
VALUES
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'category',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Electronics"}}, "description": {"source": "literal", "value": {"type": "text", "value": "Electronic components and devices"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'category',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Mechanical"}}, "description": {"source": "literal", "value": {"type": "text", "value": "Mechanical parts and assemblies"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'category',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "Raw Materials"}}, "description": {"source": "literal", "value": {"type": "text", "value": "Base materials and supplies"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa');

-- Suppliers
INSERT INTO entities (tenant_id, type_path, properties, created_by)
VALUES
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'supplier',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "TechParts Inc"}}, "email": {"source": "literal", "value": {"type": "text", "value": "orders@techparts.com"}}, "phone": {"source": "literal", "value": {"type": "text", "value": "555-0101"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'supplier',
   '{"name": {"source": "literal", "value": {"type": "text", "value": "MetalWorks LLC"}}, "email": {"source": "literal", "value": {"type": "text", "value": "sales@metalworks.com"}}, "phone": {"source": "literal", "value": {"type": "text", "value": "555-0102"}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa');

-- Inventory
INSERT INTO entities (tenant_id, type_path, properties, created_by)
VALUES
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'inventory',
   '{"product_sku": {"source": "literal", "value": {"type": "text", "value": "PCB-001"}}, "quantity": {"source": "literal", "value": {"type": "number", "value": 150}}, "location": {"source": "literal", "value": {"type": "text", "value": "Warehouse A"}}, "reorder_point": {"source": "literal", "value": {"type": "number", "value": 50}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'inventory',
   '{"product_sku": {"source": "literal", "value": {"type": "text", "value": "PSU-002"}}, "quantity": {"source": "literal", "value": {"type": "number", "value": 45}}, "location": {"source": "literal", "value": {"type": "text", "value": "Warehouse A"}}, "reorder_point": {"source": "literal", "value": {"type": "number", "value": 20}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa'),
  ('019bae6d-b0e2-3790-8b1d-007fc3bee890', 'inventory',
   '{"product_sku": {"source": "literal", "value": {"type": "text", "value": "HSG-003"}}, "quantity": {"source": "literal", "value": {"type": "number", "value": 12}}, "location": {"source": "literal", "value": {"type": "text", "value": "Warehouse B"}}, "reorder_point": {"source": "literal", "value": {"type": "number", "value": 25}}}',
   '019bae6d-b0e5-4abc-8f9f-00415fda79aa');
