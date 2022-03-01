const adjectives = require('./adjectives.js');
const nouns = require('./nouns.js');

class WordBuilder {
    constructor(template) {
        this.words = [];
        template = template || "";
        for(let t of template.split("")) {
            if(t === "a") this.addAdjective();
            if(t === "n") this.addNoun();
        }
    }

    addAdjective() {
        this.words.push(WordBuilder.getRandomAdjective());
        return this;
    }

    addNoun() {
        this.words.push(WordBuilder.getRandomNoun());
        return this;
    }

    toString(join) {
        return this.words.join(join);
    }

    static getRandomAdjective() {
        return adjectives[~~(Math.random() * adjectives.length)];
    }
    static getRandomNoun() {
        return nouns[~~(Math.random() * nouns.length)];
    }
}

module.exports = WordBuilder;