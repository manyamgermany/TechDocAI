# Best Practices and Rules for AI Coding Agents

## 1. Define Clear Coding Guidelines
Provide a comprehensive style guide or rules document covering naming conventions, error handling, architecture patterns, and code formatting. This ensures generated code is consistent, idiomatic, secure, and maintainable across the project.

## 2. Leverage AI Agents for Repetitive Tasks
Use AI coding assistants for code generation, testing, refactoring, documentation, and code reviews wherever possible to boost productivity and accuracy.
Use MCP always.@

## 3. Follow a Structured Development Workflow
Plan features in detail before coding, use an iterative edit-test-review cycle, and maintain small, frequent commits for easier review.

## 4. Adopt Monorepo for Organized Structure
Use a monorepo approach when handling multiple related projects or packages to simplify dependency management and code sharing.

## 5. Ensure Accessibility Compliance (WCAG 2.1)
Implement strict accessibility best practices, including semantic HTML, ARIA roles, keyboard navigation, and sufficient color contrast.

## 6. Implement Theming with Light and Dark Mode
Use design tokens or CSS variables for effortless switching between light and dark UI modes.

## 7. Automate Testing
Require AI-generated tests (unit and integration) alongside functionality to maintain code quality and reduce manual effort.

## 8. Use Version Control Best Practices
Enforce clear branching strategies, meaningful commit messages, and AI-assisted pull request reviews.

## 9. Prioritize Security and Privacy
Integrate security standards by validating inputs, avoiding injection vulnerabilities, handling sensitive data properly, and following data protection regulations.

## 10. Maintain Environment Consistency
Use containerization (like Docker) and infrastructure as code to ensure consistent development and production environments.

## 11. Optimize Performance
Guide AI to consider performance implications, including efficient algorithms, caching, lazy loading, and memory management.

## 12. Generate Documentation
Ensure AI agents produce clear, comprehensive documentation and inline comments explaining code intent and logic.

## 13. Provide Contextual Information
When interacting with AI, provide relevant context about project architecture, design decisions, coding patterns, and constraints for better results.

## 14. Engage in Collaborative Workflow
Treat AI as a smart junior developer—review every output carefully for security, performance, and correctness before integration.

## 15. Coding Standards and Best Practices
Follow Consistent Coding Style: Use clear naming conventions, consistent indentation, spacing, and line length limits (e.g., max 80-120 characters). Avoid ambiguous or single-letter variable names.
Readable and Maintainable Code: Write concise functions that perform single tasks, avoid deep nesting, and utilize the DRY (Don’t Repeat Yourself) principle to reduce code duplication.
Code Organization: Structure code logically with modular design, and follow industry-specific standards if applicable. Keep files and folders clean and well-organized.
Comprehensive Commenting and Documentation: Add meaningful comments especially for complex logic; provide summaries for modules and functions. Maintain up-to-date and accessible documentation.
Error Handling: Implement robust error handling with clear, informative error messages and fallback paths.
Automate Testing: Generate unit and integration tests alongside features to validate correctness, reliability, and edge cases.
Security Best Practices: Validate and sanitize inputs, avoid injection vulnerabilities, manage secrets securely, and comply with privacy regulations.
Performance Awareness: Optimize for efficiency by considering algorithm complexity, caching, lazy loading, and minimizing resource usage.