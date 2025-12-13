/**
 * API client singleton for server communication.
 *
 * All HTTP requests to the server go through this client.
 * The client handles auth headers, error transformation, and base URL configuration.
 */
import { ApiClient } from '@poolside/host';
import { hostPlatform } from '$lib/host-platform.js';
import { API_BASE_URL } from '$lib/config.js';

export const api = new ApiClient({
  platform: hostPlatform,
  apiBaseUrl: API_BASE_URL,
});
