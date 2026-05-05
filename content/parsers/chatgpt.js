import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class ChatGPTParser extends ChatParser {
    isAvailable(url) {
        return url.includes('chatgpt.com');
    }

    async parse() {
        const title = document.title || 'ChatGPT Session';
        const messages = [];

        // Check if we have iframe-based content (deep research feature)
        const iframes = document.querySelectorAll('iframe[src*="oaiusercontent.com"]');
        if (iframes.length > 0) {
            console.log('Detected iframe-based content, attempting extraction...');
            
            // Try multiple strategies to extract content
            let extractedContent = '';
            
            // Strategy 1: Look for data in script tags or window objects
            try {
                // Check if any conversation data is exposed globally
                if (window.conversationData || window.chatData) {
                    extractedContent = JSON.stringify(window.conversationData || window.chatData);
                }
            } catch (e) {
                console.log('Global data access failed:', e);
            }
            
            // Strategy 2: Look for preloaded content in hidden elements
            if (!extractedContent) {
                const hiddenSelectors = [
                    '[data-conversation]',
                    '[data-messages]',
                    '.conversation-data',
                    '.chat-transcript',
                    'pre[data-conversation]'
                ];
                
                for (const selector of hiddenSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent) {
                        extractedContent = element.textContent;
                        break;
                    }
                }
            }
            
            // Strategy 3: Enhanced text extraction from main content
            if (!extractedContent) {
                const mainContent = document.querySelector('main') || 
                                 document.querySelector('[role="main"]') || 
                                 document.querySelector('.conversation') ||
                                 document.body;
                
                if (mainContent) {
                    const textContent = mainContent.textContent || mainContent.innerText;
                    if (textContent && textContent.trim()) {
                        const lines = textContent.split('\n').filter(line => line.trim());
                        
                        // Look for conversation patterns
                        const conversationLines = lines.filter(line => 
                            line.length > 20 && // Substantial content
                            !line.includes('ChatGPT') && 
                            !line.includes('Regenerate') &&
                            !line.includes('Copy code') &&
                            !line.includes('Continue') &&
                            !line.includes('Share') &&
                            !line.includes('Thumb') &&
                            !line.includes('New chat') &&
                            !line.includes('Menu') &&
                            !line.includes('Settings') &&
                            !line.includes('History')
                        );
                        
                        if (conversationLines.length > 0) {
                            extractedContent = conversationLines.join('\n\n');
                        }
                    }
                }
            }
            
            // Strategy 4: Last resort - check for any meaningful content
            if (!extractedContent) {
                const allText = document.body.textContent || document.body.innerText;
                if (allText && allText.trim().length > 100) {
                    extractedContent = allText.trim();
                }
            }
            
            // If we found content, try to structure it
            if (extractedContent) {
                // Try to identify user vs assistant messages
                const lines = extractedContent.split('\n').filter(line => line.trim());
                
                lines.forEach(line => {
                    if (line.length > 10) {
                        // Simple heuristic: shorter lines are often user prompts
                        if (line.length < 200 || line.includes('?') || line.includes('write') || line.includes('tell')) {
                            messages.push({ 
                                role: 'User', 
                                content: line.trim() 
                            });
                        } else {
                            messages.push({
                                role: 'ChatGPT',
                                content: line.trim()
                            });
                        }
                    }
                });
            }
            
            // Add note about extraction method
            if (messages.length > 0) {
                messages.push({
                    role: 'ChatGPT',
                    content: '*Note: Content extracted from iframe-based ChatGPT interface. Some formatting may be lost.*'
                });
            } else {
                // Last resort - add a message explaining the limitation
                messages.push({
                    role: 'ChatGPT', 
                    content: '*Note: ChatGPT is using iframe-based content that cannot be accessed by browser extensions. Please try exporting from a standard ChatGPT conversation.*'
                });
            }
            
            return { title, messages };
        }

        // Strategy: ChatGPT messages are almost always wrapped in <article> tags.
        // Identify them by finding all articles in the conversation container.
        // (Usually main > div > div > div > div...)

        const articles = document.querySelectorAll('article');

        articles.forEach((article, index) => {
            console.log(`=== Processing article ${index} ===`); // Debug
            let role = 'Unknown';
            let content = '';

            // 1. Role Detection
            // Check for explicit data attribute
            const roleAttr = article.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
            if (roleAttr) {
                role = roleAttr === 'user' ? 'User' : 'ChatGPT';
            } else {
                // Heuristic: Check for specific icon containers or classes
                // User usually has an avatar or specific initials container
                // Assistant has the SVG logo.
                // Often, user has .justify-end (right side) or specific layout? No, usually stacked.

                // Try checking for "You" text label in the header part
                if (article.innerText.startsWith('You\n') || article.innerText.includes('\nYou\n')) {
                    role = 'User';
                } else {
                    role = 'ChatGPT'; // Default to Assistant if not explicitly user
                }
            }
            
            console.log(`Detected role: ${role}`); // Debug

            // 2. Content Extraction
            // We want the text content, usually in particular classes.
            // .markdown is common for Assistant.
            // User messages are often just text in a div.

            // Try specific content containers
            const contentCandidates = [
                '.markdown',
                '.prose',
                '[data-message-author-role="user"]', // Sometimes the role element IS the container
                '.whitespace-pre-wrap'
            ];

            let contentEl = null;
            for (const selector of contentCandidates) {
                contentEl = article.querySelector(selector);
                if (contentEl) break;
            }

            // Fallback: Use the article text but try to strip metadata
            if (!contentEl) {
                contentEl = article;
            }

            // 3. Image and File Extraction (MOVED UP - before DOM cleaning)
            // ChatGPT often includes images (uploaded or generated) and file attachments
            // We should try to capture both.
            
            console.log('=== Starting attachment extraction ==='); // Debug
            // Extract file attachments using regex from content
            const attachments = [];
            
            // Get the raw text content to find file names
            const rawContent = article.textContent || article.innerText;
            console.log('Raw content:', rawContent.substring(0, 200)); // Debug
            
            // Match file extensions in the content
            const filePatterns = [
                /([a-zA-Z0-9_\-]+\.tex)/g,
                /([a-zA-Z0-9_\-]+\.txt)/g,
                /([a-zA-Z0-9_\-]+\.md)/g,
                /([a-zA-Z0-9_\-]+\.pdf)/g,
                /([a-zA-Z0-9_\-]+\.doc)/g
            ];
            
            const foundFiles = new Set();
            filePatterns.forEach(pattern => {
                const matches = rawContent.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        foundFiles.add(match);
                    });
                }
            });
            
            console.log('Found files:', Array.from(foundFiles)); // Debug
            
            foundFiles.forEach(fileName => {
                const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
                
                // Determine file type
                let fileType = 'File';
                if (['tex', 'txt', 'md', 'pdf', 'doc', 'docx'].includes(fileExt)) {
                    const typeMap = {
                        'tex': 'LaTeX',
                        'txt': 'Text', 
                        'md': 'Markdown',
                        'pdf': 'PDF',
                        'doc': 'Document',
                        'docx': 'Document'
                    };
                    fileType = typeMap[fileExt] || 'File';
                }
                
                console.log('Adding attachment:', fileName, fileType); // Debug
                attachments.push({
                    name: fileName,
                    type: fileType
                });
            });

            // Common selectors: img.rounded-md, img[src*="backend-api"], or keys like "Uploaded image"
            const images = article.querySelectorAll('img');
            const seenSrcs = new Set();
            const capturedImages = [];

            images.forEach(img => {
                const src = img.getAttribute('src');
                const alt = img.getAttribute('alt') || 'Image';

                // Filter out small icons/avatars
                if (src && !seenSrcs.has(src) && (src.includes('backend-api') || src.includes('files') || src.startsWith('blob:') || alt.includes('Uploaded') || alt.includes('Generated'))) {
                    seenSrcs.add(src);
                    capturedImages.push(`![${alt}](${src})`);
                }
            });

            // Text Extraction
            // We need to be careful not to extract "Copy code", "Regenerate", etc.
            // Cloning the node to clean it up is safer.
            const clone = contentEl.cloneNode(true);

            // Remove known noise elements (but NOT file tiles)
            const noiseSelectors = ['.flex.gap-2', 'button', '.sr-only', '[role="button"]'];
            noiseSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach(n => n.remove());
            });

            // Convert HTML to markdown to preserve formatting
            content = convertToMarkdown(clone);

            // Append attachments and images to content
            const allAttachments = [];
            
            if (attachments.length > 0) {
                // Group by file type for better organization
                const groupedAttachments = {};
                attachments.forEach(att => {
                    if (!groupedAttachments[att.type]) {
                        groupedAttachments[att.type] = [];
                    }
                    groupedAttachments[att.type].push(att.name);
                });
                
                // Create organized attachment list
                Object.entries(groupedAttachments).forEach(([type, files]) => {
                    allAttachments.push(`**${type} Files:**`);
                    files.forEach(file => {
                        allAttachments.push(`- ${file}`);
                    });
                    allAttachments.push(''); // Empty line between file types
                });
            }
            
            if (capturedImages.length > 0) {
                if (allAttachments.length > 0) allAttachments.push(''); // Add spacing
                allAttachments.push('**Images:**');
                capturedImages.forEach(img => {
                    allAttachments.push(`- ${img}`);
                });
            }
            
            if (allAttachments.length > 0) {
                content = content + '\n\n**Attachments & Images:**\n' + allAttachments.join('\n');
            }

            if (content) {
                messages.push({ role, content });
            }
        });

        // Fallback: If no articles found (legacy UI or update?), try the old data-message-author-role selector
        if (messages.length === 0) {
            const messageElements = document.querySelectorAll('[data-message-author-role]');
            messageElements.forEach(el => {
                const role = el.getAttribute('data-message-author-role') === 'user' ? 'User' : 'ChatGPT';
                const contentEl = el.querySelector('.markdown') || el.querySelector('.prose') || el;
                messages.push({ role, content: convertToMarkdown(contentEl) });
            });
        }

        const metadata = {
            'Source': 'ChatGPT',
            'Date': new Date().toLocaleString(),
            'Link': window.location.href,
            'Model': document.querySelector('[data-testid="model-selector-dropdown"]')?.innerText || 'ChatGPT'
        };

        return { title, messages, metadata };
    }
}
