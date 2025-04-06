/**
 * @file utils.ts
 * @description Utility functions for handling CSS class names in the application.
 * This file provides a helper function for merging Tailwind CSS classes efficiently.
 */

/**
 * Imports required libraries:
 * - clsx: A tiny utility for constructing className strings conditionally
 * - tailwind-merge: A utility for merging Tailwind CSS classes without style conflicts
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn (classNames) - A utility function for merging CSS class names
 * 
 * This function combines the power of clsx and tailwind-merge to:
 * 1. Conditionally join class names (using clsx)
 * 2. Properly merge Tailwind CSS classes without conflicts (using tailwind-merge)
 * 
 * @param {...ClassValue[]} inputs - Any number of class names, objects, or arrays of class names
 * @returns {string} A string of merged class names optimized for Tailwind CSS
 * 
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-200')
 * 
 * // With conditions
 * cn('base-class', isActive && 'active-class')
 * 
 * // With Tailwind class merging
 * cn('px-2 py-1', 'py-2') // Will properly merge padding classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 