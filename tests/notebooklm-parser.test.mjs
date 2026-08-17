import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';

test('NotebookLMParser detects notebook.google.com and notebooklm.google.com URLs', async () => {
  const { NotebookLMParser } = await import('../content/parsers/notebooklm.js');
  const parser = new NotebookLMParser();

  assert.equal(parser.isAvailable('https://notebooklm.google.com/notebook/12345'), true);
  assert.equal(parser.isAvailable('https://notebooklm.google.com/'), true);
  assert.equal(parser.isAvailable('https://notebook.google.com/notebook/12345'), true);
  assert.equal(parser.isAvailable('https://notebook.google.com/'), true);
  assert.equal(parser.isAvailable('https://chatgpt.com/'), false);
});

test('NotebookLMParser parses user prompt and assistant response with citations', async () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Can a Computer Simulate a Brain? - Gemini Notebook</title>
      </head>
      <body>
        <div class="title-container">
          <div class="title">Can a Computer Simulate a Brain?</div>
        </div>

        <div class="chat-message-pair">
          <chat-message class="individual-message">
            <div class="from-user-container">
              <mat-card class="from-user-message-card-content">
                <mat-card-content class="message-content">
                  <div class="message-text-content">
                    <div class="md3-body-text">
                      <p>How do glia and neurons differ in density and layers?</p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </chat-message>

          <chat-message class="individual-message">
            <div class="to-user-container">
              <mat-card class="to-user-message-card-content">
                <mat-card-content class="message-content">
                  <div class="message-text-content">
                    <labs-tailwind-doc-viewer>
                      <element-list-renderer>
                        <paragraph-element-view>
                          <div class="paragraph normal">
                            <span>In a reconstructed human cerebral cortex sample, </span>
                            <b>glial cells outnumber neurons by a ratio of approximately 2:1</b>
                            <span> (32,315 glia compared to 16,087 neurons)</span>
                            <span>
                              <button class="citation-marker">
                                <span aria-label="1: Cortex Study">1</span>
                              </button>
                            </span>
                          </div>
                        </paragraph-element-view>
                      </element-list-renderer>
                    </labs-tailwind-doc-viewer>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </chat-message>
        </div>
      </body>
    </html>
  `;

  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(sampleHtml);
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  const { NotebookLMParser } = await import('../content/parsers/notebooklm.js');
  const parser = new NotebookLMParser();

  const conversation = await parser.parse();

  assert.equal(conversation.title, 'Can a Computer Simulate a Brain?');
  assert.equal(conversation.messages.length, 2);

  // User message
  assert.equal(conversation.messages[0].role, 'User');
  assert.equal(
    conversation.messages[0].content,
    'How do glia and neurons differ in density and layers?',
  );

  // Assistant message
  assert.equal(conversation.messages[1].role, 'NotebookLM');
  assert.ok(
    conversation.messages[1].content.includes(
      'glial cells outnumber neurons by a ratio of approximately 2:1',
    ),
  );
  assert.ok(conversation.messages[1].content.includes('1'));
});
