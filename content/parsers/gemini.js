import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class GeminiParser extends ChatParser {
  isAvailable(url) {
    return url.includes('gemini.google.com');
  }

  async parse() {
    console.log('[Gemini Parser] ========== STARTING PARSE() ==========');

    try {
      //1. Title Extraction - Enhanced for Deep Research
      let title = '';

      // Strategy 1: Check for Deep Research title patterns
      console.log('[Gemini Parser] Strategy 1: Looking for Deep Research title patterns...');
      const deepResearchTitle = document.querySelector(
        'h1, .title, .conversation-title, [data-testid="title"]',
      );
      if (deepResearchTitle) {
        const text = deepResearchTitle.innerText.trim();
        console.log('[Gemini Parser] Found potential title:', text);
        if (
          text.length > 5 &&
          !text.includes('Gemini') &&
          !text.includes('Help') &&
          !text.includes('Settings')
        ) {
          title = text;
          console.log('[Gemini Parser] Title set from Strategy 1:', title);
        }
      }

      // Strategy 2: Look for title in page content (Deep Research reports often have titles in content)
      if (!title) {
        console.log('[Gemini Parser] Strategy 2: Looking for title in page content...');
        const contentTitles = document.querySelectorAll(
          'main h1, main h2, article h1, article h2, .content h1, .content h2',
        );
        console.log('[Gemini Parser] Found content titles:', contentTitles.length);
        for (const el of contentTitles) {
          const text = el.innerText.trim();
          if (
            text.length > 5 &&
            !text.includes('Gemini') &&
            !text.includes('Help') &&
            !text.includes('Settings') &&
            !text.includes('Prompt:') &&
            !text.includes('Response:')
          ) {
            title = text;
            console.log('[Gemini Parser] Title set from Strategy 2:', title);
            break;
          }
        }
      }

      // Strategy 3: Top Bar or Sidebar (original logic)
      if (!title) {
        console.log('[Gemini Parser] Strategy 3: Looking for title in top bar/sidebar...');
        const possibleHeaders = document.querySelectorAll(
          'h1, button[aria-haspopup="true"], button[aria-expanded]',
        );
        console.log('[Gemini Parser] Found possible headers:', possibleHeaders.length);

        for (const el of possibleHeaders) {
          const text = el.innerText.trim();
          if (
            text.length > 5 &&
            !text.includes('Gemini') &&
            !text.includes('Help') &&
            !text.includes('Settings')
          ) {
            const rect = el.getBoundingClientRect();
            if (rect.top < 100 && rect.left > 50) {
              title = text;
              console.log('[Gemini Parser] Title set from Strategy 3:', title);
              break;
            }
          }
        }
      }

      if (!title) {
        console.log('[Gemini Parser] Strategy 4: Looking for active navigation...');
        const activeNav = document.querySelector('a[aria-current="page"], .selected');
        if (activeNav) title = activeNav.innerText;
      }

      if (!title) {
        console.log('[Gemini Parser] Strategy 5: Using document.title...');
        title = document.title
          .replace(/Google/g, '')
          .replace(/Gemini/g, '')
          .replace(/- /g, '')
          .trim();
      }

      if (!title || title.length < 2) {
        title = 'Gemini Conversation';
      }

      console.log('[Gemini Parser] Final title:', title);

      const messages = [];
      const seenTexts = new Set();

      console.log('[Gemini Parser] Starting content extraction...');
      let extractionAttempted = false;

      // 2. Content Extraction - Enhanced for Deep Research
      // Try multiple strategies to extract content

      // Strategy 1: Original conversation containers
      console.log('[Gemini Parser] Strategy 1: Looking for conversation containers...');
      const conversationContainers = document.querySelectorAll('.conversation-container');
      console.log('[Gemini Parser] Found conversation containers:', conversationContainers.length);
      if (conversationContainers.length > 0) {
        console.log('[Gemini Parser] Processing conversation containers...');
        extractionAttempted = true;
        conversationContainers.forEach((container) => {
          console.log('[Gemini Parser] Processing conversation container...');

          // First, check for user query
          const userQuery = container.querySelector('user-query');
          if (userQuery) {
            console.log('[Gemini Parser] Found user query...');
            const queryText = userQuery.querySelector('.query-text');
            if (queryText) {
              console.log('[Gemini Parser] Found query text...');
              const clone = queryText.cloneNode(true);
              clone
                .querySelectorAll('.cdk-visually-hidden, [class*="screen-reader"]')
                .forEach((el) => el.remove());
              const userText = clone.innerText.trim();
              if (userText && !seenTexts.has(userText)) {
                seenTexts.add(userText);
                messages.push({
                  role: 'User',
                  content: userText,
                });
                console.log(
                  '[Gemini Parser] Added user message:',
                  userText.substring(0, 50) + '...',
                );
              }
            }
          }

          // Then, check for model response
          const modelResponse = container.querySelector('model-response');
          if (modelResponse) {
            console.log('[Gemini Parser] Found model response...');
            const messageContent = modelResponse.querySelector('message-content');
            if (messageContent) {
              console.log('[Gemini Parser] Found message content...');
              const markdownDiv = messageContent.querySelector(
                '.markdown.markdown-main-panel, .markdown',
              );
              if (markdownDiv) {
                console.log('[Gemini Parser] Found markdown div...');
                // Clone to avoid modifying the original DOM
                const clone = markdownDiv.cloneNode(true);

                // Remove UI elements that shouldn't be in the export
                clone
                  .querySelectorAll(
                    'button, .thoughts-container, .thoughts-wrapper, model-thoughts, .table-footer, .hide-from-message-actions',
                  )
                  .forEach((el) => el.remove());

                // Remove response-element wrappers (they contain export buttons)
                clone.querySelectorAll('response-element').forEach((el) => {
                  // Keep the table but remove the wrapper
                  while (el.firstChild) {
                    el.parentNode.insertBefore(el.firstChild, el);
                  }
                  el.remove();
                });

                // Convert to markdown
                const text = convertToMarkdown(clone);
                console.log('[Gemini Parser] Converted to markdown, length:', text.length);
                console.log('[Gemini Parser] Full markdown content:');
                console.log(text);
                console.log('[Gemini Parser] End of markdown content');

                if (text && text.trim() && !seenTexts.has(text.trim())) {
                  seenTexts.add(text.trim());
                  messages.push({
                    role: 'Model',
                    content: text.trim(),
                  });
                  console.log(
                    '[Gemini Parser] Added model message:',
                    text.substring(0, 50) + '...',
                  );
                }
              } else {
                console.log(
                  '[Gemini Parser] No markdown div found, trying comprehensive content extraction...',
                );

                // Strategy 1: Look for content in nested elements within message-content
                const nestedSelectors = [
                  'div[class*="content"]',
                  'div[class*="research"]',
                  'div[class*="report"]',
                  'div[class*="analysis"]',
                  'div[class*="section"]',
                  'div[class*="paragraph"]',
                  'p',
                  'article',
                  'section',
                ];

                let foundContent = false;
                for (const selector of nestedSelectors) {
                  const nestedElements = messageContent.querySelectorAll(selector);
                  console.log(
                    '[Gemini Parser] Looking for nested elements with selector:',
                    selector,
                    'found:',
                    nestedElements.length,
                  );

                  nestedElements.forEach((element) => {
                    const text = element.innerText.trim();
                    if (text.length > 100) {
                      console.log('[Gemini Parser] Found nested content, length:', text.length);
                      console.log(
                        '[Gemini Parser] Nested content preview:',
                        text.substring(0, 200) + '...',
                      );

                      const isDeepResearch =
                        text.includes('research') ||
                        text.includes('analysis') ||
                        text.includes('findings') ||
                        text.includes('cost') ||
                        text.includes('sweetener') ||
                        text.includes('projection') ||
                        text.includes('historical') ||
                        text.includes('economic') ||
                        text.includes('market') ||
                        text.includes('price') ||
                        text.includes('industry');

                      console.log('[Gemini Parser] Is Deep Research content:', isDeepResearch);

                      if (!seenTexts.has(text)) {
                        seenTexts.add(text);
                        messages.push({
                          role: 'Model',
                          content: text,
                        });
                        console.log(
                          '[Gemini Parser] Added nested content, Deep Research:',
                          isDeepResearch,
                        );
                        foundContent = true;
                      }
                    }
                  });

                  if (foundContent) break;
                }

                // Strategy 2: Look for content in parent/sibling elements of model-response
                if (!foundContent) {
                  console.log('[Gemini Parser] Trying parent/sibling element extraction...');
                  const parentContainer = modelResponse.parentElement;
                  if (parentContainer) {
                    const siblings = parentContainer.children;
                    console.log('[Gemini Parser] Checking siblings, count:', siblings.length);

                    Array.from(siblings).forEach((sibling) => {
                      if (sibling !== modelResponse) {
                        const text = sibling.innerText.trim();
                        if (text.length > 200) {
                          console.log(
                            '[Gemini Parser] Found sibling content, length:',
                            text.length,
                          );
                          console.log(
                            '[Gemini Parser] Sibling content preview:',
                            text.substring(0, 200) + '...',
                          );

                          if (!seenTexts.has(text)) {
                            seenTexts.add(text);
                            messages.push({
                              role: 'Model',
                              content: text,
                            });
                            console.log('[Gemini Parser] Added sibling content');
                            foundContent = true;
                          }
                        }
                      }
                    });
                  }
                }

                // Strategy 3: Look for content in the entire conversation container (outside model-response)
                if (!foundContent) {
                  console.log('[Gemini Parser] Trying full container content extraction...');
                  const containerText = container.innerText.trim();
                  console.log('[Gemini Parser] Full container text length:', containerText.length);

                  if (containerText.length > 500) {
                    console.log(
                      '[Gemini Parser] Full container content preview:',
                      containerText.substring(0, 200) + '...',
                    );

                    if (!seenTexts.has(containerText)) {
                      seenTexts.add(containerText);
                      messages.push({
                        role: 'Model',
                        content: containerText,
                      });
                      console.log('[Gemini Parser] Added full container content');
                      foundContent = true;
                    }
                  }
                }

                // Strategy 4: Last resort - get all text from message-content
                if (!foundContent) {
                  const allText = messageContent.innerText.trim();
                  console.log('[Gemini Parser] Last resort text length:', allText.length);
                  console.log(
                    '[Gemini Parser] Last resort text preview:',
                    allText.substring(0, 200) + '...',
                  );

                  if (allText && allText.length > 50) {
                    // Check if this looks like Deep Research content
                    const isDeepResearch =
                      allText.includes('research') ||
                      allText.includes('analysis') ||
                      allText.includes('findings') ||
                      allText.includes('cost') ||
                      allText.includes('sweetener') ||
                      allText.includes('projection') ||
                      allText.includes('historical');

                    console.log('[Gemini Parser] Is Deep Research content:', isDeepResearch);

                    if (!seenTexts.has(allText)) {
                      seenTexts.add(allText);
                      messages.push({
                        role: 'Model',
                        content: allText,
                      });
                      console.log(
                        '[Gemini Parser] Added last resort model message, Deep Research:',
                        isDeepResearch,
                      );
                    }
                  }
                }
              }
            } else {
              console.log(
                '[Gemini Parser] No message-content found, trying direct model-response text...',
              );
              // Fallback: get text directly from model-response
              const directText = modelResponse.innerText.trim();
              console.log('[Gemini Parser] Direct model response text length:', directText.length);

              if (directText && directText.length > 50) {
                const isDeepResearch =
                  directText.includes('research') ||
                  directText.includes('analysis') ||
                  directText.includes('findings') ||
                  directText.includes('cost') ||
                  directText.includes('sweetener') ||
                  directText.includes('projection') ||
                  directText.includes('historical');

                console.log('[Gemini Parser] Direct text is Deep Research:', isDeepResearch);

                if (!seenTexts.has(directText)) {
                  seenTexts.add(directText);
                  messages.push({
                    role: 'Model',
                    content: directText,
                  });
                  console.log(
                    '[Gemini Parser] Added direct model message, Deep Research:',
                    isDeepResearch,
                  );
                }
              }
            }
          }
        });
      }

      // Strategy 2: Deep Research content extraction
      if (!extractionAttempted) {
        console.log(
          '[Gemini Parser] Strategy 2: No conversation containers found, trying Deep Research panel...',
        );
        extractionAttempted = true;

        // First try Deep Research immersive panel structure
        console.log('[Gemini Parser] Looking for deep-research-immersive-panel...');
        const deepResearchPanel = document.querySelector('deep-research-immersive-panel');
        console.log('[Gemini Parser] Deep Research panel found:', !!deepResearchPanel);

        if (deepResearchPanel) {
          console.log('[Gemini Parser] Processing Deep Research panel...');

          // Extract title from panel
          const panelTitle = deepResearchPanel.querySelector('.title-text, h2, h1');
          if (panelTitle && !title) {
            const titleText = panelTitle.innerText.trim();
            console.log('[Gemini Parser] Found panel title:', titleText);
            if (titleText.length > 5 && !titleText.includes('Gemini')) {
              title = titleText;
              console.log('[Gemini Parser] Title updated from panel:', title);
            }
          }

          // Extract content from panel
          console.log('[Gemini Parser] Calling extractDeepResearchPanelContent...');
          const panelContent = this.extractDeepResearchPanelContent(deepResearchPanel);
          console.log('[Gemini Parser] Panel content extracted, sections:', panelContent.length);

          if (panelContent.length > 0) {
            panelContent.forEach((section) => {
              if (section.content && !seenTexts.has(section.content)) {
                seenTexts.add(section.content);
                messages.push({
                  role: section.role,
                  content: section.content,
                });
                console.log(
                  '[Gemini Parser] Added panel section, role:',
                  section.role,
                  'length:',
                  section.content.length,
                );
              }
            });
          } else {
            console.log('[Gemini Parser] No panel content found, trying fallback...');
          }
        } else {
          console.log('[Gemini Parser] No Deep Research panel found');
        }

        // Fallback: Look for content in main, article, or content areas
        if (messages.length === 0) {
          console.log('[Gemini Parser] Strategy 3: Trying fallback content extraction...');
          const contentSelectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '[role="main"]',
            '.conversation-content',
            '.chat-content',
            '.message-content',
          ];

          let contentFound = false;

          for (const selector of contentSelectors) {
            console.log('[Gemini Parser] Trying selector:', selector);
            const contentElement = document.querySelector(selector);
            if (contentElement) {
              console.log('[Gemini Parser] Found content element:', !!contentElement);
              // Extract all text content from the main content area
              const textContent = contentElement.innerText.trim();
              console.log('[Gemini Parser] Text content length:', textContent.length);

              if (textContent && textContent.length > 100) {
                // Try to identify user prompts and responses
                const sections = this.extractDeepResearchSections(contentElement);
                console.log('[Gemini Parser] Extracted sections:', sections.length);

                if (sections.length > 0) {
                  sections.forEach((section) => {
                    if (section.content && !seenTexts.has(section.content)) {
                      seenTexts.add(section.content);
                      messages.push({
                        role: section.role,
                        content: section.content,
                      });
                      console.log('[Gemini Parser] Added fallback section, role:', section.role);
                    }
                  });
                  contentFound = true;
                  break;
                } else {
                  // If we can't parse sections, treat the whole content as a response
                  console.log('[Gemini Parser] Treating whole content as response...');
                  const markdown = convertToMarkdown(contentElement);
                  if (markdown && markdown.trim() && !seenTexts.has(markdown.trim())) {
                    seenTexts.add(markdown.trim());
                    messages.push({
                      role: 'Model',
                      content: markdown.trim(),
                    });
                    console.log('[Gemini Parser] Added fallback message');
                    contentFound = true;
                    break;
                  }
                }
              }
            }
          }

          // Strategy 3: Fallback - look for any meaningful content
          if (!contentFound) {
            console.log('[Gemini Parser] Strategy 4: Final fallback - extracting body content...');
            const bodyContent = document.body.innerText.trim();
            console.log('[Gemini Parser] Body content length:', bodyContent.length);

            if (bodyContent && bodyContent.length > 200) {
              // Try to extract structured content from body
              const sections = this.extractDeepResearchSections(document.body);
              console.log('[Gemini Parser] Body sections extracted:', sections.length);

              if (sections.length > 0) {
                sections.forEach((section) => {
                  if (section.content && !seenTexts.has(section.content)) {
                    seenTexts.add(section.content);
                    messages.push({
                      role: section.role,
                      content: section.content,
                    });
                    console.log('[Gemini Parser] Added body section, role:', section.role);
                  }
                });
              } else {
                // Last resort - treat as single response
                console.log('[Gemini Parser] Last resort - treating as single response...');
                messages.push({
                  role: 'Model',
                  content: bodyContent,
                });
                console.log('[Gemini Parser] Added last resort message');
              }
            }
          }
        }
      }

      console.log('[Gemini Parser] Total messages extracted:', messages.length);
      console.log('[Gemini Parser] ========== FINISHING PARSE() ==========');

      return {
        title: title,
        messages: messages,
        url: window.location.href, // Add URL for metadata
      };
    } catch (error) {
      console.error('[Gemini Parser] Error during parsing:', error);
      return {
        title: 'Gemini Conversation',
        messages: [],
        url: window.location.href,
      };
    }
  }

  // Helper method to extract sections from Deep Research content
  extractDeepResearchSections(contentElement) {
    console.log('[Gemini Parser] Extracting Deep Research sections...');
    const sections = [];
    const text = contentElement.innerText || '';

    // Look for common Deep Research patterns
    const patterns = [
      // Pattern 1: "Prompt:" and "Response:" sections
      {
        promptRegex:
          /(?:Prompt|You said)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Response|I've completed|Generating|Start research)|$)/i,
        responseRegex:
          /(?:Response|I've completed|Generating|Start research)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Prompt|You said)|$)/i,
      },
      // Pattern 2: Question/Answer format
      {
        promptRegex: /(?:Question|Q)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Answer|A|Response)|$)/i,
        responseRegex: /(?:Answer|A|Response)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Question|Q)|$)/i,
      },
      // Pattern 3: Look for research plan and results
      {
        promptRegex:
          /(?:Research plan|Research query|What is|How has|What's the projection)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:I've completed|Research|Analysis|Results)|$)/i,
        responseRegex:
          /(?:I've completed|Research|Analysis|Results|Findings)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Research plan|Research query|What is|How has)|$)/i,
      },
    ];

    // Try each pattern
    for (const pattern of patterns) {
      console.log('[Gemini Parser] Trying pattern...');
      const promptMatches = text.match(pattern.promptRegex);
      const responseMatches = text.match(pattern.responseRegex);

      if (promptMatches && promptMatches[1]) {
        const promptContent = promptMatches[1].trim();
        console.log('[Gemini Parser] Found prompt content, length:', promptContent.length);
        if (promptContent.length > 20) {
          sections.push({
            role: 'User',
            content: promptContent,
          });
          console.log('[Gemini Parser] Added prompt section');
        }
      }

      if (responseMatches && responseMatches[1]) {
        const responseContent = responseMatches[1].trim();
        console.log('[Gemini Parser] Found response content, length:', responseContent.length);
        if (responseContent.length > 50) {
          sections.push({
            role: 'Model',
            content: responseContent,
          });
          console.log('[Gemini Parser] Added response section');
        }
      }

      // If we found meaningful sections, stop trying other patterns
      if (sections.length > 0) {
        console.log('[Gemini Parser] Found sections using pattern matching');
        return sections;
      }
    }

    // If no structured sections found, try to extract based on HTML structure
    console.log('[Gemini Parser] Trying HTML structure extraction...');
    const userElements = contentElement.querySelectorAll(
      '.user-query, .prompt, .question, [data-role="user"]',
    );
    console.log('[Gemini Parser] Found user elements:', userElements.length);
    userElements.forEach((el) => {
      const clone = el.cloneNode(true);
      clone
        .querySelectorAll('.cdk-visually-hidden, [class*="screen-reader"]')
        .forEach((subEl) => subEl.remove());
      const content = clone.innerText.trim();
      if (content.length > 20) {
        sections.push({
          role: 'User',
          content: content,
        });
        console.log('[Gemini Parser] Added user element from HTML structure');
      }
    });

    // Look for elements that might contain responses
    const responseElements = contentElement.querySelectorAll(
      '.model-response, .response, .answer, [data-role="model"], .research-content',
    );
    console.log('[Gemini Parser] Found response elements:', responseElements.length);
    responseElements.forEach((el) => {
      const content = el.innerText.trim();
      if (content.length > 50) {
        sections.push({
          role: 'Model',
          content: content,
        });
        console.log('[Gemini Parser] Added response element from HTML structure');
      }
    });

    // If still no sections, try to split by common delimiters
    if (sections.length === 0) {
      console.log('[Gemini Parser] Trying delimiter splitting...');
      const delimiterPatterns = [
        /\n\s*You said\s*\n/i,
        /\n\s*Response\s*\n/i,
        /\n\s*Prompt\s*\n/i,
        /\n\s*I've completed\s*\n/i,
      ];

      let parts = [text];
      delimiterPatterns.forEach((pattern) => {
        parts = parts.flatMap((part) => part.split(pattern));
      });

      parts.forEach((part, index) => {
        const trimmedPart = part.trim();
        if (trimmedPart.length > 50) {
          // Alternate between User and Model roles
          const role = index % 2 === 0 ? 'User' : 'Model';
          sections.push({
            role: role,
            content: trimmedPart,
          });
          console.log('[Gemini Parser] Added delimiter section, role:', role);
        }
      });
    }

    console.log('[Gemini Parser] Total sections extracted:', sections.length);
    return sections;
  }

  // Helper method to extract content from Deep Research immersive panel
  extractDeepResearchPanelContent(panelElement) {
    console.log('[Gemini Parser] Looking for Deep Research panel content...');
    const sections = [];

    console.log('[Gemini Parser] Panel element found:', !!panelElement);
    console.log(
      '[Gemini Parser] Panel innerText length:',
      panelElement.innerText ? panelElement.innerText.length : 0,
    );

    try {
      // Look for content within panel
      const contentSelectors = [
        '.markdown',
        '.content',
        '.research-content',
        '.panel-content',
        'div[class*="content"]',
        'div[class*="markdown"]',
        'div[class*="research"]',
      ];

      for (const selector of contentSelectors) {
        console.log('[Gemini Parser] Trying selector:', selector);
        const contentElements = panelElement.querySelectorAll(selector);
        console.log('[Gemini Parser] Found elements:', contentElements.length);
        contentElements.forEach((element) => {
          const text = element.innerText.trim();
          if (text.length > 100) {
            sections.push({
              role: 'Model',
              content: text,
            });
            console.log('[Gemini Parser] Added panel content via selector:', selector);
          }
        });
      }

      // If no structured content found, extract all text from panel
      if (sections.length === 0) {
        console.log('[Gemini Parser] No structured content found, extracting all panel text...');
        const panelText = panelElement.innerText.trim();
        console.log('[Gemini Parser] Panel text length:', panelText.length);
        if (panelText.length > 200) {
          // Try to split into logical sections
          const parts = this.splitIntoSections(panelText);
          console.log('[Gemini Parser] Split into parts:', parts.length);
          parts.forEach((part) => {
            if (part.length > 50) {
              sections.push({
                role: 'Model',
                content: part,
              });
              console.log('[Gemini Parser] Added panel text part');
            }
          });
        }
      }
    } catch (error) {
      console.error('[Gemini Parser] Error extracting panel content:', error);
    }

    console.log('[Gemini Parser] Panel content extraction complete, sections:', sections.length);
    return sections;
  }

  // Helper method to split text into logical sections
  splitIntoSections(text) {
    console.log('[Gemini Parser] Splitting text into sections...');
    const sections = [];

    // Try to split by common delimiters
    const delimiters = [
      /\n\n+/g, // Double newlines
      /\n(?=[A-Z])/g, // Newline followed by capital letter
      /\.\s+/g, // Period followed by space
    ];

    let parts = [text];
    delimiters.forEach((delimiter) => {
      parts = parts.flatMap((part) => part.split(delimiter));
    });

    // Filter and clean sections
    parts.forEach((part) => {
      const cleaned = part.trim();
      if (cleaned.length > 50 && !cleaned.match(/^\d+$/)) {
        sections.push(cleaned);
        console.log('[Gemini Parser] Added split section, length:', cleaned.length);
      }
    });

    console.log('[Gemini Parser] Text splitting complete, sections:', sections.length);
    return sections;
  }
}
