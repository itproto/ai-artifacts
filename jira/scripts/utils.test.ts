import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { deriveSprintFromPath, extractGherkin, parseStoryFile } from './utils.js';

describe('deriveSprintFromPath', () => {
  it('extracts sprint name from sprints directory', () => {
    const p = path.join('jira', 'sprints', 'sprint-01', 'STORY-001.md');
    expect(deriveSprintFromPath(p)).toBe('sprint-01');
  });

  it('returns null for backlog', () => {
    const p = path.join('jira', 'backlog', 'STORY-002.md');
    expect(deriveSprintFromPath(p)).toBeNull();
  });

  it('returns null for done', () => {
    const p = path.join('jira', 'done', 'TASK-001.md');
    expect(deriveSprintFromPath(p)).toBeNull();
  });
});

describe('extractGherkin', () => {
  it('extracts gherkin block under Acceptance Criteria heading', () => {
    const content = `
## Acceptance Criteria

\`\`\`gherkin
Feature: View todos

  Scenario: User sees list
    Given I open the app
    Then I see todos
\`\`\`
`;
    const result = extractGherkin(content);
    expect(result).toContain('Feature: View todos');
    expect(result).toContain('Scenario: User sees list');
  });

  it('returns null when no gherkin block present', () => {
    const content = `## Acceptance Criteria\n\nNo scenarios written yet.`;
    expect(extractGherkin(content)).toBeNull();
  });

  it('ignores gherkin blocks outside Acceptance Criteria section', () => {
    const content = `
## Notes

\`\`\`gherkin
Feature: Should not be extracted
\`\`\`

## Acceptance Criteria

No gherkin here.
`;
    expect(extractGherkin(content)).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(extractGherkin('')).toBeNull();
  });

  it('extracts gherkin block after an H3 sub-heading inside Acceptance Criteria', () => {
    const content = `
## Acceptance Criteria

### Happy path

\`\`\`gherkin
Feature: Sub-heading gherkin

  Scenario: still extracted
    Given I am inside an H3
    Then gherkin is still found
\`\`\`
`;
    const result = extractGherkin(content);
    expect(result).toContain('Feature: Sub-heading gherkin');
    expect(result).toContain('still extracted');
  });

  it('does not extract gherkin after a heading following Acceptance Criteria', () => {
    const content = `
## Acceptance Criteria

No gherkin here.

## Notes

\`\`\`gherkin
Feature: Should not be extracted
\`\`\`
`;
    expect(extractGherkin(content)).toBeNull();
  });
});

describe('parseStoryFile', () => {
  function writeTempStory(frontmatter: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-test-'));
    const filePath = path.join(dir, 'STORY-001-test.md');
    fs.writeFileSync(filePath, `---\n${frontmatter}\n---\n\n## Content\n`);
    return filePath;
  }

  it('parses a valid closed story with a reason', () => {
    const filePath = writeTempStory(
      'id: STORY-001\ntitle: Test\ntype: story\nstatus: closed\nlayer: frontend\nreason: cancelled'
    );
    const story = parseStoryFile(filePath);
    expect(story.frontmatter.status).toBe('closed');
    expect(story.frontmatter.reason).toBe('cancelled');
  });

  it('throws for a closed story missing the reason field', () => {
    const filePath = writeTempStory(
      'id: STORY-002\ntitle: Test\ntype: story\nstatus: closed\nlayer: frontend'
    );
    expect(() => parseStoryFile(filePath)).toThrow("non-empty 'reason' field");
  });

  it('throws for a closed story with a blank reason', () => {
    const filePath = writeTempStory(
      'id: STORY-003\ntitle: Test\ntype: story\nstatus: closed\nlayer: frontend\nreason: "   "'
    );
    expect(() => parseStoryFile(filePath)).toThrow("non-empty 'reason' field");
  });

  it('throws for a closed task missing the reason field', () => {
    const filePath = writeTempStory(
      'id: TASK-001\ntitle: Test\ntype: task\nstatus: closed\nlayer: backend'
    );
    expect(() => parseStoryFile(filePath)).toThrow("non-empty 'reason' field");
  });

  it('parses a non-closed story without a reason', () => {
    const filePath = writeTempStory(
      'id: STORY-004\ntitle: Test\ntype: story\nstatus: backlog\nlayer: backend'
    );
    const story = parseStoryFile(filePath);
    expect(story.frontmatter.status).toBe('backlog');
    expect(story.frontmatter.reason).toBeUndefined();
  });

  it('throws when required frontmatter fields are missing', () => {
    const filePath = writeTempStory('id: STORY-005\ntitle: Test');
    expect(() => parseStoryFile(filePath)).toThrow('missing required frontmatter fields');
  });
});
