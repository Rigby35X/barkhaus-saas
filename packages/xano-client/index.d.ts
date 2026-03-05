export interface ConfigureOptions {
  baseUrl: string;
}

export interface FormSubmissionsParams {
  org_id: number;
  form_type?: 'contact' | 'waitlist';
  status?: 'new' | 'read' | 'replied' | 'archived';
  limit?: number;
  offset?: number;
}

export interface LoginResponse {
  authToken: string;
  [key: string]: unknown;
}

export interface User {
  id: number;
  email: string;
  [key: string]: unknown;
}

export interface Organization {
  id: number;
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface Animal {
  id: number;
  organization_id: number;
  name: string;
  [key: string]: unknown;
}

export interface Application {
  id: number;
  organization_id: number;
  [key: string]: unknown;
}

export interface FormSubmission {
  id: number;
  org_id: number;
  form_type: string;
  status: string;
  [key: string]: unknown;
}

export function configure(options: ConfigureOptions): void;
export function setToken(token: string | null): void;

export function getOrg(slug: string): Promise<Organization | null>;
export function getOrgById(id: number): Promise<Organization>;

export function getAnimals(orgId: number): Promise<Animal[]>;
export function getAnimal(id: number): Promise<Animal>;
export function createAnimal(orgId: number, data: Partial<Animal>): Promise<Animal>;
export function updateAnimal(id: number, data: Partial<Animal>): Promise<Animal>;
export function deleteAnimal(id: number): Promise<void>;

export function getApplications(orgId: number): Promise<Application[]>;
export function createApplication(orgId: number, data: Partial<Application>): Promise<Application>;
export function updateApplication(id: number, data: Partial<Application>): Promise<Application>;

export function login(email: string, password: string): Promise<LoginResponse>;
export function getMe(token: string): Promise<User>;

export function getFormSubmissions(params: FormSubmissionsParams): Promise<FormSubmission[]>;
export function updateFormSubmission(id: number, status: string, adminNotes?: string): Promise<FormSubmission>;
