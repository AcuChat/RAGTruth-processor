const debug = false;

require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const fsPromises = require('fs').promises;
const nlp = require('./nlp');
const convertString = require('convert-string');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_ICLOUD);

const {VertexAI} = require('@google-cloud/vertexai');
const octoai = require('@octoai/client');
const lodash = require('lodash');

const octoaiTest = async () => {
    const client = new octoai.Client(process.env.OCTOAI_API_KEY);
    const completion = await client.chat.completions.create( {
        "messages": [
            {
            "role": "system",
            "content": "You are a helpful assistant. Keep your responses limited to one short paragraph if possible."
            },
            {
            "role": "user",
            "content": "Hello world"
            }
        ],
        "model": "llama-2-13b-chat-fp16",
        "max_tokens": 128,
        "presence_penalty": 0,
        "temperature": 0.1,
        "top_p": 0.9
    });

    console.log(completion);
    let nextToken = completion?.choices[0]?.message?.content;

    nextToken = "[[[DONE]]]";
    console.log('token', token);
}
//octoaiTest();

async function geminiTextFromText(prompt) {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  
    //const prompt = "Write a story about a magic backpack."
  
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
}

async function geminiTextStreamFromText(prompt, id, socket) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContentStream(prompt);
    console.log(result);

    let text = '';
    for await (const chunk of result.stream) {
        const nextToken = chunk.text();
        socket.emit('nextToken', {id, nextToken})
    }

    const nextToken = '[[[DONE]]]';
    socket.emit('nextToken', {id, nextToken})
}

//geminiTextStreamFromText('Using 500 words, write a news article on the following topic: Why Pitbulls Make Great Pets.');
  

const { Configuration, OpenAIApi } = require("openai");

const openAIModels = [
    {
        id: 'gpt-3.5-turbo',
        maxTokens: '4k'
    },
    {
        id: 'gpt-4',
        maxTokens: '8k'
    },
    {
        id: 'gpt-3.5-turbo-16k',
        maxTokens: '16k'
    },
    {
        id: 'gpt-4-32k',
        maxTokens: '32k'
    }
]

const configuration = new Configuration({
    apiKey: process.env.FUSAION_OPENAI_KEY,
  });
const openai = new OpenAIApi(configuration);
const sleep = seconds => new Promise(r => setTimeout(r, seconds * 1000));

exports.initialMessagePair = (prompt, service = "You are a helpful assistant.") => {
    return [
        {
            role: 'system',
            content: service,

        },
        {
            role: 'user',
            content: prompt
        }
    ]
}

exports.convertChatToOpenAIFormat = (chat, service = 'You are a helpful assistant') => {
    const messages = chat.map(m => {
        return m.source === 'user' ? { role: "user", content: m.message} : { role: 'assistant', content: m.message} 
    });

    messages.unshift({
        role: 'system',
        content: service
    })

    console.log('messages', messages);
    return messages;
}

exports.convertChatToGeminiFormat = (chat) => {
    const messages = chat.map(m => {
        if (m.source) return m.source === 'user' ? { role: "user", parts: [{text: m.message}]} : { role: 'model', parts: [{text: m.message}]} 
        if (m.role) return m.role === 'user' ? { role: "user", parts: [{text: m.content}]} : { role: 'model', parts: [{text: m.content}]} 
    });

    if (messages[0].role === 'model') messages.shift();



    // messages.unshift({
    //     role: 'system',
    //     content: service
    // })

    return messages;
}



exports.useFineTuneModel = async (model, prompt) => {
    console.log('useFineTuneModel()');
    const request = {
        url: `https://api.openai.com/v1/chat/completions`,
        method: 'post',
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FUSAION_OPENAI_KEY}`
        },
        data: {
            model,
            messages: [
                {
                    role: 'system',
                    content: "You are an assistant that replaces all pronouns and coreferences with their references."
                },
                {
                    role: 'user',
                    content: `For the provided Text, replace pronouns and coreferences with their references.\n\nText:\n${prompt}`
                }
            ]
        }
    }

    try {
        const response = await axios(request);
        console.log(response.data.choices[0].message.content);
        return response.data.choices[0].message.content;

    } catch (e) {
        console.error(e);
        return false;
    }
}


/*
 * top_p: what percentage of the top tokens to consider when formulating an answer
 *      Default: 1
 *      0.3 means only consider the top 30% by mass // should not use less than this
 * temperature: Adjusts the way that remaining tokens are handle (the tokens that remain after top_p is applied)
 *      1: The percentage chance of a token being selected is proportional to its probability of matching the query
 *      0: Only the top most token will be chosen. A lower setting than 1 increasingly excludes lower probability tokens from being selected.
 *      0.9: Great for creative applications; whereas 0 is good for greater accuracy
 *      2: Now every token has an equal probability score, meaning that every token has an equal chance of being selected
 * n: The number of responses that you want.
 *      Important: Make sure the temperature is not at 0 otherwise all the responses will be the same
 */

exports.openAIImage = async (apiKey, prompt, n = 1, size='1024x1024', model='dall-e-3') => {
    const request = {
        url: 'https://api.openai.com/v1/images/generations',
        method: 'post',
        headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${apiKey}`, 
        },
        data: {
            model, prompt, n, size
        }
    }

    try {
        const response = await axios(request);
        console.log(response.data);
        return response.data.data[0].url;

    } catch(err) {
        console.error(err);
        console.log(err.response.data);
        return false;
    }
}

exports.getOpenAIImage = async (apiKey, prompt, n = 1, size='1024x1024', model='dall-e-3') => {
    if (debug) console.log('TURBO', prompt);

    if (!prompt.endsWith("\n")) prompt += "\n";

    let result;
    let success = false;
    let count = 0;
    let seconds = 15;
    let maxCount = 10;
    while (!success) {
        try {
            result = await this.openAIImage(apiKey, prompt, n, size, model);
            return result;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText, err.response.data);
            ++count;
            if (count >= maxCount || err.response.status === 400) {
                console.log("STATUS 400 EXIT");
                return false;
            }
            seconds *= 2;
            await sleep(seconds);
            console.log('Retrying query:', prompt);
        }
    }

    return false;
}

const convertToHex = (delim) => {
    return this.split("").map(function(c) {
        return ("0" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(delim || "");
};

//exports.getOpenAIImage(process.env.FUSAION_OPENAI_KEY, 'Hotel in Rome.');
exports.openAIGenericChatCompletionSocketStream = async (apiKey, model, messages, id, projectId = '', socket = null, temperature = .4, top_p = null, maxRetries = 10) => {
    console.log('ai.openAIGenericChatCompletionSocketStream model', model, JSON.stringify(messages, null, 4))
    const request = {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        responseType: 'stream',
        data: {
            model,
            messages,
            stream: true
        }
    }

    //console.log(request); return;
    if (top_p !== null) request.data.top_p = top_p;
    if (temperature !== null) request.data.temperature = temperature;

    //console.log(request); return;

    let success = false;
    let count = 0;
    let seconds = 3;
    let result = false;

    while (!success) {
        try {
            result = await axios(request);
            stream = result.data;
            let countMe = 1;
            let text = '';
            stream.on('data', (chunk) => {
                text += chunk.toString();
                let loc = text.indexOf("\n\n");
                while (loc !== -1) {
                    const info = text.substring(0, loc);
                    //console.log('info', info);
                    text = text.substring(loc+2);
                    loc = text.indexOf("\n\n");
                    if (info.includes('[DONE]')) return;
                    if (info.startsWith("data:")) {
                        const data = JSON.parse(info.replace("data: ", ""));
                        try {
                            let nextToken = data.choices[0].delta?.content;
                            if (nextToken) {
                                //nextToken = nextToken.replaceAll("\n", "[[[NewLine]]]")
                                //console.log(`nextToken: [${nextToken}] ${convertString.stringToBytes(nextToken)}`);
                                
                                socket.emit('nextToken', {id, nextToken})
                            }
                        } catch (error) {
                            console.log(`Error with JSON.parse and ${chunk}.\n${error}`);
                            
                        }
                    }
                }
            });

            stream.on('end', () => {
                console.log('[DONE]');
                if (socket) socket.emit('nextToken', {id, projectId, nextToken:'[[[DONE]]]'})
            });
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText);
            ++count;
            if (count >= maxRetries || (err.response.status >= 400 && err.response.status <= 499) ) {
                console.log("STATUS 400 EXIT");
            
                return {
                    status: 'error',
                    number: err.response.status,
                    message: err.response.statusText,
                }
            }
            seconds *= 2;
            console.error(`${model} is busy. Sleeping now.`)
            await sleep(seconds);
            console.error(`Retrying query for ${model}`);
        }
    }

    // const response = {
    //     status: 'success',
    //     finishReason: result.data.choices[0].finish_reason,
    //     content: result.data.choices[0].message.content
    // }

    // if (debug) console.log(response);

    return result;
}

exports.llamaGenericChatCompletionSocketStream = async (model, contents, id, projectId, socket) => {
    //const contents = exports.convertChatToGeminiFormat(chat);

    try {
        const client = new octoai.Client(process.env.OCTOAI_API_KEY);
        const completion = await client.chat.completions.create( {
            "messages": contents,
            "model": model,
            // "max_tokens": 128,
            // "presence_penalty": 0,
            // "temperature": 0.1,
            // "top_p": 0.9
        });
    
        console.log(completion);
        let nextToken = completion?.choices[0]?.message?.content;
        socket.emit('nextToken', {id, nextToken: nextToken.trim()})
    
        nextToken = "[[[DONE]]]";
        console.log('token', token);
        socket.emit('nextToken', {id, nextToken: '[[[DONE]]]'})
          
          return;
    } catch (err) {
        console.error(err);
    }
}


exports.geminiGenericChatCompletionSocketStream = async (model, contents, id, projectId, socket) => {
    //const contents = exports.convertChatToGeminiFormat(chat);

    console.log('geminiGenericChatCompletionSocketStream', model, JSON.stringify(contents, null,), id);
    
    try {
        const googleProjectId = 'gen-lang-client-0668296192';
        const location = 'us-central1';
        const model = 'gemini-pro';
        const vertexAI = new VertexAI({project: googleProjectId, location: location});
        const generativeModel = vertexAI.preview.getGenerativeModel({
            model: model,
          });
        
        const request = {
            contents: lodash.cloneDeep(contents)
          };
          console.log('Gemini Request: ', JSON.stringify(request, null, 4));
          
          const streamingResp = await generativeModel.generateContentStream(request);
          console.log('Gemini streaming response', streamingResp);
          
          for await (const item of streamingResp.stream) {
            const nextToken = item?.candidates[0]?.content?.parts[0]?.text;
            socket.emit('nextToken', {id, nextToken})
            console.log('token: ', nextToken);
          }
          socket.emit('nextToken', {id, nextToken: '[[[DONE]]]'})
          
          return;
    } catch (err) {
        let nextToken = 'Sorry, an error has occurred. Please try again.'
        socket.emit('nextToken', {id, nextToken})
        socket.emit('nextToken', {id, nextToken: '[[[DONE]]]'})
        console.error(err);
    }
}


const testMeNow = async () => {
    const messages = exports.initialMessagePair('Using 500 words, explain why pitbulls make great pets.');
    const response = await exports.openAIGenericChatCompletionSocketStream(process.env.FUSAION_OPENAI_KEY, 'gpt-3.5-turbo-1106', messages);
    console.log('response', response);
}
//testMeNow()


exports.openAIGenericChatCompletion = async (apiKey, model, messages, temperature = .4, top_p = null, maxRetries = 10) => {
    //console.log('ai.openAIGenericChatCompletion model', model, JSON.stringify(messages, null, 4))
    const request = {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        data: {
            model,
            messages
        }
    }

    if (top_p !== null) request.data.top_p = top_p;
    if (temperature !== null) request.data.temperature = temperature;

    //console.log(request); return;

    let success = false;
    let count = 0;
    let seconds = 3;

    while (!success) {
        try {
            result = await axios(request);
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText);
            ++count;
            if (count >= maxRetries || (err.response.status >= 400 && err.response.status <= 499) ) {
                console.log("STATUS 400 EXIT");
            
                return {
                    status: 'error',
                    number: err.response.status,
                    message: err.response.statusText,
                }
            }
            seconds *= 2;
            console.error(`${model} is busy. Sleeping now.`)
            await sleep(seconds);
            console.error(`Retrying query for ${model}`);
        }
    }

    const response = {
        status: 'success',
        finishReason: result.data.choices[0].finish_reason,
        content: result.data.choices[0].message.content
    }

    if (debug) console.log(response);

    return response;
}

exports.getGenericText = async (apiKey, prompt, model = "gpt-3.5-turbo-1106", temperature = 0.4) => {
    messages = [
        {
            role: 'system',
            content: 'You are a helpful, accurate assistant.',

        },
        {
            role: 'user',
            content: prompt
        }
    ]

    return await this.openAIGenericChatCompletion(apiKey, model, messages);
}



async function turboChatCompletion (prompt, temperature = 0, service = 'You are a helpful, accurate assistant.', messages = []) {
    /* 
     * NO NEED TO SPECIFY MAX TOKENS
     * role: assistant, system, user
     */

    const request = {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.FUSAION_OPENAI_KEY}`,
        },
        data: {
            //model: "gpt-3.5-turbo-16k",
            model: "gpt-3.5-turbo-1106",
            temperature,
            messages:[
                {
                    role: 'system',
                    content: service,

                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }
    }

    console.log('turboChatCompletion', request);
    // return;

    return axios(request);
}

exports.getTurboResponse = async (prompt, temperature = 0, debugMe = false, service = 'You are a helpful, accurate assistant.') => {
    if (debug) console.log('TURBO', prompt);

    if (!prompt.endsWith("\n")) prompt += "\n";

    let result;
    let success = false;
    let count = 0;
    let seconds = 3;
    let maxCount = 10;
    while (!success) {
        try {
            result = await turboChatCompletion(prompt, temperature, service);
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText, err.response.data);
            ++count;
            if (count >= maxCount || err.response.status === 400) {
                console.log("STATUS 400 EXIT");
                return {
                    status: 'error',
                    number: err.response.status,
                    message: err.response,
                }
            }
            seconds *= 2;
            await sleep(seconds);
            console.log('Retrying query:', prompt);
        }
    }

    // console.log('getTurboResponse', request);
    // return;

    const response = {
        status: 'success',
        finishReason: result.data.choices[0].finish_reason,
        content: result.data.choices[0].message.content
    }

    if (debug) console.log(response);

    return response;
}


async function gpt4Completion (prompt, temperature = 0, service = 'You are a helpful, accurate assistant.') {
    /* 
     * NO NEED TO SPECIFY MAX TOKENS
     * role: assistant, system, user
     */

    const request = {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.FUSAION_OPENAI_KEY}`,
        },
        data: {
            model: "gpt-4",
            temperature,
            messages:[
                {
                    role: 'system',
                    content: service,

                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }
    }

    return axios(request);
}

exports.getGPT4Response = async (prompt, temperature = 0, debugMe = false, service = 'You are a helpful, accurate assistant.') => {
    if (debug) console.log('TURBO', prompt);

    if (!prompt.endsWith("\n")) prompt += "\n";

    let result;
    let success = false;
    let count = 0;
    let seconds = 3;
    let maxCount = 10;
    while (!success) {
        try {
            result = await gpt4Completion(prompt, temperature, service);
            success = true;
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText, err.response.data);
            ++count;
            if (count >= maxCount || err.response.status === 400) {
                console.log("STATUS 400 EXIT");
                return {
                    status: 'error',
                    number: err.response.status,
                    message: err.response,
                }
            }
            seconds *= 2;
            await sleep(seconds);
            console.log('Retrying query:', prompt);
        }
    }

    const response = {
        status: 'success',
        finishReason: result.data.choices[0].finish_reason,
        content: result.data.choices[0].message.content
    }

    if (debug) console.log(response);

    return response;
}

const testMe = async () => {
    const result = await exports.openAIGenericChatCompletion('What color is the sky?', openAIModels[3].id);
    console.log(result);
}

//testMe();


exports.getDivinciResponse = async (prompt, output = 'text', temperature = .7, debugMe = false) => {
    const numPromptTokens = nlp.numGpt3Tokens(prompt);

    if (debugMe) console.log('DIVINCI PROMPT', numPromptTokens, prompt);

    const request = {
        url: 'https://api.openai.com/v1/completions',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.FUSAION_OPENAI_KEY}`,
        },
        data: {
            model: "text-davinci-003",
            prompt,
            max_tokens: 4000 - numPromptTokens,
            temperature
        }
    }

    let response;
    let success = false;
    let count = 0;
    let seconds = 3;
    let maxCount = 10;

    while (!success) {
        try {
            response = await axios(request);
            if (debugMe) console.log(response.data);
            success = true;
            
        } catch (err) {
            console.error("axios err.data", err.response.status, err.response.statusText, err.response.data);
            ++count;
            if (count >= maxCount || err.response.status === 400) {
                console.log("STATUS 400 EXIT");
                return false;
            }
            seconds *= 2;
            await sleep(seconds);
            console.log('Retrying query:', prompt);
        }
    }

    if (output === 'text') return response.data.choices[0].text.replaceAll('“', '"').replaceAll('”', '"');

    let json;
    try {
        json = JSON.parse(response.data.choices[0].text.replaceAll("\n", "").replaceAll('“', '"').replaceAll('”', '"'));
    } catch (err) {
        return false;
    }

    return json;
}

exports.promptToGoogleQueries = async (prompt, apiKey, model = "gpt-3.5-turbo-1106") => {
    const newPrompt = `'''Prompt:\n${prompt}\n\nGoogle Search:'''`;
    const service = `You are a google search expert. You return a list of google search queries that would provide relevant information to complete the prompt. You provide a maximum of five google search queries. The return format must be a stringified JSON array.`
    const messages = this.initialMessagePair(newPrompt, service);
    const response = await this.openAIGenericChatCompletion (apiKey, model, messages);
    if (response.status !== 'success') return false;
    console.log(typeof response, response)
    const content = response?.content;
    if (!content) return [];
    try {
        json = JSON.parse(content.replaceAll("\n", "").replaceAll('“', '"').replaceAll('”', '"'));
        if (json.length) return json;
    } catch (err) {
        
    }
    const lines = response.content.split("\n");
    console.log('lines', lines)
    if (lines.length > 2) {
        const test1 = lines[0] === '```json';
        const test2 = lines[lines.length-1] === '```'
        if (test1 && test2) {
            lines.shift();
            lines.pop();
            const jsonStr = lines.join('');
            const array = JSON.parse(jsonStr);
            console.log(array);
            return array;
        } 
        
        if (lines[0].startsWith('[')) {
            const jsonStr = lines.join('');
            const array = JSON.parse(jsonStr);
            console.log(array);
            return array;
        }

        console.error('promptToGoogleQueries need to convert to array', response.content);
        return false;
    
       
        
    
    }
    console.log(response);
}

// let testPrompt = "Write a 5 paragraph essay on George Washington.";
// promptToGoogleQueries(testPrompt, process.env.FUSAION_OPENAI_KEY, )

const dTest = async () => {
    prompt = `"""Below is some Content and FactLinks. Using 692 words, rewrite the content using HTML by incorporating 5 FactLinks verbatim, as-is.
  
    [Format Guide: Use headings, subheadings, tables, bullet points, paragraphs, links, and bold to organize the information. There must be a minimum of 5 FactLinks included.] 
    
    Content:
    Inflation has been a major concern for American voters and the Biden administration, but there is finally some good news on the horizon. According to the U.S. Bureau of Labor Statistics, inflation slowed in May to the lowest rate in two years, largely due to declining prices for energy such as gasoline and electricity. The consumer price index increased 4% in May relative to a year earlier, a slowdown from 4.9% in April. 
  
  One of the most significant categories in the consumer price index is housing, which accounts for more than a third of the CPI weighting, the most of any other consumer good or service. Housing inflation has been stubbornly high for months, but economists believe it has peaked and is on the precipice of a reversal. Price changes in "shelter" were generally muted before the pandemic, but Covid-19 warped that dynamic: Housing costs shot up but have slowed and even started to fall in some areas, economists said. 
  
  While shelter is still playing a big role in inflation, it should be slowing in the second half of the year. In May, shelter prices rose 0.6%, up from 0.4% in April. They're up 8% in the past year. Monthly prices for used cars and trucks, motor vehicle insurance, apparel, personal care, and education also increased notably in May, according to the BLS. When measuring increases over the past year, notable categories include motor vehicle insurance, which saw prices jump by 17.1%, recreation (4.5%), household furnishings and operations (4.2%), and new vehicles (4.7%). 
  
  Aside from energy, many consumer categories also deflated from April to May, including airline fares, communication, new vehicles, and recreation, according to the BLS. Over the past year, there was deflation in categories such as airline fares, car and truck rentals, citrus fruits, fresh whole milk, and used cars and trucks. 
  
  Inflation is still high enough to concern the Federal Reserve, but drops in food and fuel prices might explain why consumers have lowered their forecast for where they expect inflation to be in the short term. The New York Fed reported that consumer expectations for inflation a year from now have declined. However, prices are still much higher than they were before the pandemic, and other economic headwinds remain on the horizon, including stubbornly high shelter inflation, increasingly restrictive monetary policy, as well as the possibility of a recession. 
  
  The May PPI report is the second piece of good inflation news in a two-day span: On Tuesday, the Producer Price Index showed that annual price increases seen by producers measured 1.1% for the 12 months ended in May, easing sharply from the 2.3% bump recorded in April. Driven by a decline in energy prices and food prices, this inflation measure has now decelerated for 11 consecutive months. It’s now at its lowest annual reading since December 2020, when post-pandemic demand was starting to return and producer prices were beginning their upward inflationary march. 
  
  Overall, while inflation is still a concern, there are signs that it may be easing. This is good news for consumers and the Biden administration, as high inflation can be a burden on many people. The Federal Reserve is expected to pause after more than a year of interest rate hikes, but they may not be done for good since inflation remains elevated. If inflation can get under 4% and closer to 2%, the White House and the Biden campaign would be on stronger footing. However, they will have to be careful since they have a credibility problem coming out of the beginning of inflation.
    
    FactLinks:
    <a href="https://www.bloomberg.com/news/newsletters/2023-06-13/inflation-is-easing-that-s-good-news-for-consumers-and-biden" target="_blank">INFLATION</a> IS EASING. THAT'S GOOD NEWS FOR CONSUMERS AND BIDEN
  After soaring last year, <a href="https://www.bloomberg.com/news/newsletters/2023-06-13/inflation-is-easing-that-s-good-news-for-consumers-and-biden" target="_blank">egg prices</a> saw a big drop
  Finally, some good news on inflation for <a href="https://www.bloomberg.com/news/newsletters/2023-06-13/inflation-is-easing-that-s-good-news-for-consumers-and-biden" target="_blank">American voters</a> — and by extension, Joe Biden.
  Housing is perhaps the most consequential category in the <a href="https://www.cnbc.com/2023/06/14/housing-inflation-will-almost-surely-fall-soon-say-economists.html" target="_blank">consumer price index</a>, a key inflation barometer.
  As the largest expense for an average <a href="https://www.cnbc.com/2023/06/14/housing-inflation-will-almost-surely-fall-soon-say-economists.html" target="_blank">U.S. household</a>, shelter accounts for more than a third of the CPI weighting, the most of any other consumer good or service.
  <a href="https://www.cnbc.com/2023/06/14/housing-inflation-will-almost-surely-fall-soon-say-economists.html" target="_blank">Housing inflation</a> has been stubbornly high for months, according to CPI data.
  Inflation slowed in May to the lowest rate in two years, largely on the back of declining prices for energy such as gasoline and electricity, the <a href="https://www.cnbc.com/2023/06/13/heres-the-inflation-breakdown-for-may-2023-in-one-chart.html" target="_blank">U.S. Bureau of Labor Statistics</a> said Tuesday.
  The <a href="https://www.cnbc.com/2023/06/13/heres-the-inflation-breakdown-for-may-2023-in-one-chart.html" target="_blank">consumer price index</a> increased 4% in May relative to a year earlier, a slowdown from 4.9% in April.
  <a href="https://www.cnbc.com/2023/06/13/heres-the-inflation-breakdown-for-may-2023-in-one-chart.html" target="_blank">Shelter prices</a> rose 0.6% in May, up from 0.4% in April. They're up 8% in the past year.
  Inflation is still high enough to concern the <a href="https://www.politico.com/news/2023/06/14/the-new-inflation-politics-00101900" target="_blank">Federal Reserve</a>
  <a href="https://www.politico.com/news/2023/06/14/the-new-inflation-politics-00101900" target="_blank">Energy prices</a> dropped a whopping 3.6 percent — with gasoline alone plunging 5.6 percent
  Food prices ticked up only 0.2 percent in May compared to April, with <a href="https://www.politico.com/news/2023/06/14/the-new-inflation-politics-00101900" target="_blank">grocery costs</a> essentially flat after falling in the previous two months
  US inflation at the wholesale level has cooled once again, this time landing well below its pre-pandemic average. The Producer Price Index showed that annual price increases seen by producers measured 1.1% for the 12 months ended in May, easing sharply from the 2.3% bump recorded in April, according to data released Wednesday by the <a href="https://www.cnn.com/2023/06/14/economy/ppi-inflation-may/index.html" target="_blank">Bureau of Labor Statistics</a>.
  The PPI is a closely watched inflation gauge, since it captures <a href="https://www.cnn.com/2023/06/14/economy/ppi-inflation-may/index.html" target="_blank">average price shifts</a> upstream of the consumer. It’s viewed as a potential leading indicator of how prices could eventually behave at the store level.
  Stripping out the more volatile categories of energy and food, the core PPI index showed that prices increased 0.2% from April and moderated to 2.8% on an annual basis. The May PPI report is the second piece of good inflation news in a two-day span: On Tuesday, the <a href="https://www.cnn.com/2023/06/14/economy/ppi-inflation-may/index.html" target="_blank">Consumer Price Index</a> showed that inflation eased to 4% on an annual basis in May."""
  
  `;

  let response = await exports.getDivinciResponse(prompt);

  console.log("RESPONSE", response);
}

//dTest();

const getTurboJSON = async (prompt, temperature = .4) => {
    let response = await this.getTurboResponse(prompt, temperature);

    console.log('PROMPT', prompt);
    console.log('RESPONSE', response);

    if (response.status === 'error') return false;

    try {
        //console.log('getting JSON');
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        //console.log('JSON', json);
        return json;
    } catch (err) {
        //console.log('JSON ERROR');
        //console.error(err);
        return false;
    }
}

const getTurboText = async (prompt, temperature = .4) => {
    //console.log('getTurboText');
    let response = await this.getTurboResponse(prompt, temperature);

    if (response.status === 'error') return false;

    return response.content;
}

exports.getChatJSON = async (prompt, temperature = .4) => getTurboJSON(prompt, temperature);
exports.getChatText = async (prompt, temperature = .4) => {
    console.error(`WARNING: ai.getChatText uses private openai key!!!`)
    return getTurboText(prompt, temperature);
}

exports.rewriteAsNewArticle = async (text) => {
    // console.log('typeof text', typeof text, text)
    const numTextWords = text.split(' ').length;
    const numResponseWords = Math.floor(.9 * numTextWords);

    const prompt = `'''Rewrite the following Document in the format of a news article. Use simple terms and sentences. The response must be at least ${numResponseWords} words.
    
    Document:
    ${text}'''`

    return await this.getChatText(prompt);
}

exports.getGist = async (text, numSentences = 3) => {
    const prompt = `"""Give the overall gist of the Text below in ${numSentences > 1 ? `${numSentences} sentences` : `1 sentence`}.
    
    Text:
    ${text}\n"""\n`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}

exports.getKeywordsAndAffiliations = async (text) => {
    const prompt = `"""Provide a list of keywords and a list of affiliations contained in the following text. The keyword list must include all names of people, organizations, events, products, and services as well as all significant topics, concepts, and ideas. The affiliation list must include the individual's name as well as all titles, roles, and organizations that the individual is affiliated with. The returned format must be stringified JSON in the following format: {
        "keywords": array of keywords goes here,
        "affiliations": array of affiliations goes here
        }
        
        Text:
        ${text}
        """
        `
    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }


    return response.content;
}

exports.getConceptsNamesAndAffiliations = async (text) => {
    const prompt = `"""Provide a list of concepts, names, and affiliations contained in the following text. The concept list must include all significant topics, concepts, and ideas. The names list must include all names of all people, organizations, events, products, and services. The affiliation list must include each individual's name as well as all titles, roles, and organizations that the individual is affiliated with. The returned format must be stringified JSON in the following format: {
        "concepts": array of concepts goes here,
        "names": array of names goes here,
        "affiliations": array of affiliations goes here
        }
        
        Text:
        ${text}
        """
        `
    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }


    return response.content;
}

exports.getFactsRelatedToTopic = async (topic, text) => {
    const prompt = `"""I want to find all facts, ideas, and concepts in the provided Text that are related to the Topic provided below. Be sure to include all relevant facts, ideas, and concepts. If there are no facts, ideas, or concepts related to the topic then return an empty list. 

    The return format must solely be stringified JSON in the following format: {
    "facts": array of relevant facts, ideas, and concepts goes here
    }
    
    Topic:
    ${topic}

    Text:
    ${text}
    """
    `

    let response = await this.getTurboResponse(prompt, .4);

    console.log("RESPONSE", response);

    if (response.status === 'error') return false;

    let json;
    try {
        json = JSON.parse(response.content.replaceAll("\n", ""));
        
    } catch (err) {
        json = false;
    }
    
    console.log('json', json);

    return json;
}

exports.getOverallTopic = async (text, numWords = 32) => {
    const prompt = `"""In ${numWords} words, tell me the overall gist of the following text.

    Text:
    ${text}
    """`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}

exports.getTopicAndGist = async (text, numGistSentences = 3, numTopicWords = 32) => {
    const prompt = `"""In ${numGistSentences > 1 ? `${numGistSentences} sentences` : `1 sentence`} tell me the gist of the following text. Also, in ${numTopicWords} words or less, tell me the overall topic of the following text. The return format must be in stringified JSON in the following format: {
        "gist": gist goes here,
        "topic": topic goes here
    }

    Text:
    ${text}
    """`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }
}

exports.getRelevantFacts = async (text, numFacts = 3) => {
    const prompt = `"""Find the ${numFacts} most relevant facts in regards to the Text below. The The return format must be in stringified JSON in the following format: {
        "facts": array of facts goes here
    }

    Text:
    ${text}
    """`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    try {
        const json = JSON.parse(response.content.replaceAll("\n", ""));
        return json;
    } catch (err) {
        return false;
    }
}

exports.getArticleFromSourceList = async (topic, sourceList) => {
    const prompt = `"""Acting as a witty professor, write a warm and conversational news article on the Topic below using the facts from the various Sources below. Create the article using as many facts as possible without repeating any information.
    
    Topic:
    ${topic}\n
    ${sourceList}"""\n`;

    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}

exports.rewriteArticleInEngagingManner = async (article) => {
    const prompt = `"""As a professional journalist, rewrite the following News Article in a dynamic and engaging style. Ensure your response preserves all the quotes in the news article.
    News Article:
    ${article}\n"""\n`;
    
    let response = await this.getTurboResponse(prompt, .4);

    if (response.status === 'error') return false;

    return response.content;
}


exports.extractReleventQuotes = async (topic, text) => {
    const prompt = `"""Below is a Topic and Text. I want to find all the speaker quotes cited in the Text that are relevant to the Topic. I solely want quote citations that are relevant to the topic.  The return format must solely be stringified JSON in the following format:
    {
        "quotes": array of relevant quotes along with the name of the speaker in the following format goes here {"quote": relevant quote, "speaker": speaker of relevant quote}
    }
        
    Topic:
    ${topic}

    Text:
    ${text.trim()}"""
    `;
 
    return await getTurboJSON(prompt, .4);
}

exports.insertQuotesFromQuoteList = async (initialArticle, quoteList) => {
    const prompt = `"""Below is a News Article and a list of Quotes. For each quote that is relevant to the news article, make the news article longer by incorporating every relevant quote. If none of the quotes are relevant to the news article then return the news article in its original form.
    
    News Article:
    ${initialArticle}
    
    ${quoteList}
    """
    `
   return await getTurboText(prompt, .4);
}

exports.answerPromptSolelyBasedOnContext = async (prompt, context) => {
    prompt = `"""Below is a News Article and a list of Quotes. For each quote that is relevant to the news article, make the news article longer by incorporating every relevant quote. If none of the quotes are relevant to the news article then return the news article in its original form.
    
    News Article:
    ${initialArticle}
    
    ${quoteList}
    """
    `
   return await getTurboText(prompt, .4);
}


exports.getTagsAndTitles = async (article, openAIKey, numTitles = 10) => {
    const prompt = `"""Give ${numTitles} interesting, eye-catching titles for the provided Content below.
    Also generate a list of tags that include the important words and phrases in the response. 
    The list of tags must also include the names of all people, products, services, places, companies, and organizations mentioned in the response.
    Also generate a conclusion for the Content.
    The return format must be stringified JSON in the following format: {
        "titles": array of titles goes here
        "tags": array of tags go here
        "conclusion": conclusion goes here
    }
    Content:
    ${article}\n"""\n`;
    const response = await this.getGenericText(openAIKey, prompt);
    console.log(response.content);
    let content = response.content;
    if (content.startsWith('```json')) {
        const lines = content.split("\n");
        lines.pop();
        lines.shift();
        content = lines.join("\n");
    }
    console.log(content);
    const tt = JSON.parse(content.replaceAll("\n", ""));
    return tt;
}

const playground = async () => {
    const prompt = `"""Make a list of 20 titles that I can use for an article on why pitbulls make the best pets. The return format must be stringified JSON in the following format:{
        titles: array of titles goes here
    }"""\n`

    const response = await exports.getChatJSON(prompt);
    response.titles.forEach((r, i) => {
        console.log(`Title ${i}:`, r)
    })
}

//playground()

const chat = [
    {source: 'user', message: 'What is the capital of Florida?'},
    {source: 'model', message: 'Tallahassee'},
    {source: 'user', message: 'And what about Georigia?'},
    
]

const vertexAITest = async () => {
    const contents = exports.convertChatToGeminiFormat(chat);

    try {
        const projectId = 'gen-lang-client-0668296192';
        const location = 'us-central1';
        const model = 'gemini-pro';
        const vertexAI = new VertexAI({project: projectId, location: location});
        const generativeModel = vertexAI.preview.getGenerativeModel({
            model: model,
          });
        

          const request = {
            contents
          };
          const streamingResp = await generativeModel.generateContentStream(request);
          for await (const item of streamingResp.stream) {
            const token = item?.candidates[0]?.content?.parts[0]?.text;

            console.log('stream chunk: ', JSON.stringify(token));
          }
          console.log('aggregated response: ', JSON.stringify(await streamingResp.response));
          return;
    } catch (err) {
        console.error(err);
    }
}


