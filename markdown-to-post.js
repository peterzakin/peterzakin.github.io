#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Converts markdown to HTML post with consistent styling
 * @param {string} markdownPath - Path to markdown file
 * @param {string} outputPath - Path for output HTML file (optional)
 * @param {Object} options - Configuration options
 * @param {string} options.title - Post title (defaults to h1 from markdown)
 * @param {string} options.date - Post date (defaults to today)
 */
function markdownToPost(markdownPath, outputPath, options = {}) {
    // Read markdown file
    const markdown = fs.readFileSync(markdownPath, 'utf-8');

    // Parse title from first h1 or use provided title
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = options.title || (titleMatch ? titleMatch[1] : 'Untitled');

    // Parse date or use provided/default
    const date = options.date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Convert markdown to HTML
    const html = convertMarkdownToHTML(markdown);

    // Generate full HTML document
    const fullHTML = generateHTMLTemplate(title, date, html);

    // Determine output path
    const output = outputPath || markdownPath.replace(/\.md$/, '.html');

    // Write file
    fs.writeFileSync(output, fullHTML, 'utf-8');

    console.log(`✓ Created post: ${output}`);
    return output;
}

/**
 * Simple markdown to HTML converter
 * Supports: headings, paragraphs, lists, links, bold, images
 */
function convertMarkdownToHTML(markdown) {
    let html = markdown;

    // Remove title (first h1) as it's handled in template
    html = html.replace(/^#\s+.+$/m, '');

    // Convert headings (h2, h3, h4)
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');

    // Convert images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<img src='$2' alt='$1' />");

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2'>$1</a>");

    // Convert bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert unordered lists
    html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\s*)+/gs, (match) => {
        return '<ul>\n' + match + '</ul>\n';
    });

    // Convert paragraphs (lines separated by blank lines)
    const lines = html.split('\n');
    const processed = [];
    let paragraph = [];

    for (let line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
            if (paragraph.length > 0) {
                const text = paragraph.join(' ').trim();
                // Don't wrap if already an HTML tag
                if (!text.match(/^<(h\d|ul|li|img)/)) {
                    processed.push(`<p>${text}</p>`);
                } else {
                    processed.push(text);
                }
                paragraph = [];
            }
            continue;
        }

        // If it's already an HTML tag, flush paragraph and add tag
        if (trimmed.match(/^<(h\d|ul|li|img)/)) {
            if (paragraph.length > 0) {
                const text = paragraph.join(' ').trim();
                processed.push(`<p>${text}</p>`);
                paragraph = [];
            }
            processed.push(trimmed);
        } else {
            paragraph.push(trimmed);
        }
    }

    // Flush remaining paragraph
    if (paragraph.length > 0) {
        const text = paragraph.join(' ').trim();
        if (!text.match(/^<(h\d|ul|li|img)/)) {
            processed.push(`<p>${text}</p>`);
        } else {
            processed.push(text);
        }
    }

    return processed.join('\n\n    ');
}

/**
 * Generate HTML template with consistent styling
 */
function generateHTMLTemplate(title, date, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: "Georgia", serif;
            margin: 40px;
            line-height: 1.6;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            color: #333;
            background-color: #f4f4f4;
            padding:20px;
        }
        h1 {
            font-size: 2em;
            color: #000;
        }
        h2 {
            font-size: 1.5em;
            color: #333;
        }
        p {
            margin-bottom: 20px;
        }

        li {
            margin-bottom: 10px;
        }
        a {
            color: #1a0dab;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }

        .footnote, .reference {
            font-size: 0.8em;
            color: #555;
            margin-bottom:10px;
        }

         .date {
            font-size: 1em;
            color: #555;
        }

    </style>
</head>
<body>
    <h1>${title}</h1>
    <p class='date'>${date}</p>
    ${content}
</body>
</html>
`;
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node markdown-to-post.js <input.md> [output.html] [--title "Title"] [--date "Date"]');
        console.log('\nExample:');
        console.log('  node markdown-to-post.js post.md');
        console.log('  node markdown-to-post.js post.md output.html --title "My Post" --date "January 1, 2025"');
        process.exit(1);
    }

    const inputPath = args[0];
    let outputPath = args[1];
    const options = {};

    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--title' && args[i + 1]) {
            options.title = args[i + 1];
            i++;
        } else if (args[i] === '--date' && args[i + 1]) {
            options.date = args[i + 1];
            i++;
        } else if (!args[i].startsWith('--') && i === 1) {
            outputPath = args[i];
        }
    }

    try {
        markdownToPost(inputPath, outputPath, options);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = { markdownToPost };
