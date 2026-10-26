import type { APIRoute } from 'astro';
import { animalRuntime } from '../../../../services/animals/runtime.ts';
export const prerender = false;
export const GET: APIRoute = ({ request }) => animalRuntime(request);
export const POST: APIRoute = ({ request }) => animalRuntime(request);
