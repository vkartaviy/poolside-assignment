/**
 * Svelte app entry point.
 */

import './styles/theme.css';
import App from './App.svelte';
import { mount } from 'svelte';

mount(App, { target: document.getElementById('app')! });
