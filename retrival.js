const fs = require('fs');
const path = require('path');

function loadFiles(dir) {

    const fullPath = path.join(__dirname, dir);

    const files = fs.readdirSync(fullPath);

    return files.map(file => {

        const content = fs.readFileSync(
            path.join(fullPath, file),
            'utf8'
        );

        return JSON.parse(content);
    });
}

function scoreEntry(entry, question) {

    const text = JSON.stringify(entry).toLowerCase();

    const words = question.toLowerCase().split(' ');

    let score = 0;

    words.forEach(word => {

        if (text.includes(word)) {
            score += 1;
        }
    });

    return score;
}

function retrieveRelevantKnowledge(question) {

    const sources = [
        ...loadFiles('knowledge/kb'),
        ...loadFiles('knowledge/customer_cases'),
        ...loadFiles('knowledge/internal_notes')
    ];

    const ranked = sources
        .map(entry => ({
            entry,
            score: scoreEntry(entry, question)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    return ranked
        .filter(r => r.score > 0)
        .map(r => JSON.stringify(r.entry))
        .join('\n\n');
}

module.exports = {
    retrieveRelevantKnowledge
};