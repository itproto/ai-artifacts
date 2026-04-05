import { describe, it, expect } from 'vitest';
import path from 'path';
import { deriveSprintFromPath, extractGherkin } from './utils.js';

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
});
