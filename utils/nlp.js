const winkNLP = require( 'wink-nlp' );
const its = require( 'wink-nlp/src/its' );
const model = require( 'wink-eng-lite-web-model' );
const nlp = winkNLP( model );
const {encode, decode} = require('gpt-3-encoder')

exports.getSentences  = (text) => { 
    const doc = nlp.readDoc( text );
    const sentences = doc.sentences().out();
    return sentences;
}

exports.numGpt3Tokens = text => {
    const encoded = encode(text);

    return encoded.length;
} 

exports.getTokenChunks = (text, maxTokens = 2000, overlap = 500) => {
    const chunks = [];
    let sentences = exports.getSentences(text);
    sentences = sentences.map(sentence => {
        return {
            sentence,
            numTokens: exports.numGpt3Tokens(sentence)
        }
    })

    const overlapCount = maxTokens - overlap;

    let startIndex = 0;
    let overlapIndex = -1;
    let count = 0;
    let curChunk = [];

    for (let i = 0; i < sentences.length; ++i) {
        count += sentences[i].numTokens;

        if (count > overlapCount && overlapIndex === -1) overlapIndex = i - 1 > startIndex ? i - 1 : startIndex + 1;
        if (count < maxTokens) {
            curChunk.push(sentences[i].sentence);
        } else {
            chunks.push(curChunk.join(' '));
            curChunk = [];
            count = 0;
            startIndex = overlapIndex - 1;
            i = startIndex;
            overlapIndex = -1;
        }
    }

    if (curChunk.length) chunks.push(curChunk.join(' '));

   return chunks;
}


const playground = async () => {

    const text = `There's a new app in town.`
    const numTokens = exports.numGpt3Tokens(text)
    console.log('numTokens', numTokens);
}

playground()