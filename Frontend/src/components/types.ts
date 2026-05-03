export interface Research {
  id: number; // bigint (int8) from backend
  title: string;
  category: string;
  coordinator: string; // Comes as JSON string: {"name":"", "email":""}
  researchers: string; // Comes as JSON string array: [{"name":"", "email":""}]
  views: number;
  validations: number;
  status: string;
  createdAt: string;
}