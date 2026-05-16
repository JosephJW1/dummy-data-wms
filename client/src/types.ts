export interface ColumnDef {
  key: string;
  label: string;
  targetTab?: string;
  targetIdKey?: string;
}

export interface ViewSchema {
  id: string;
  name: string;
  columns: ColumnDef[];
}