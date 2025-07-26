// src/utils/linkify.ts
import DOMPurify from 'dompurify';

export const linkify = (text: string): string => {
    if (!text) return ""; // Handle empty or undefined text
    
    try {
        // First, clean any existing malformed HTML tags
        const cleanedText= text.replace(/<a\s[^>]*>/gi, '').replace(/<\/a>/gi, '');
        
        // Then process URLs
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
        const linkedText = cleanedText.replace(urlRegex, (url: string) => 
            `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`
        );
        
        // Sanitize the HTML to prevent XSS attacks
        return DOMPurify.sanitize(linkedText);
    } catch (error) {
        console.error('Error in linkify:', error);
        return text; // Return original text if something goes wrong
    }
};