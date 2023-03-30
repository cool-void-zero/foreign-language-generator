const TelegramBot = require('node-telegram-bot-api');
//	custom class
const { QuestionGenerator } = require("./QuestionGenerator");

class LanguageBot{
    //  get default generate parameters value
    getDefaultGenerate({
        native_language = "Chinese",
        foreign_language = "English", 
        level = "B1", 
        topic = "lexicon",
        type = "radio", 
        //  number of questions
        numbers = 5, 
    } = {
        native_language: "Chinese",
        foreign_language: "English", 
        level: "B1", 
        topic: "lexicon",
        type: "radio", 
        numbers: 5, 
    }){
        return {
            native_language: native_language,
            foreign_language: foreign_language, 
            level: level, 
            topic: topic,
            type: type, 
            numbers: numbers, 
        };
    }

    constructor({
        openai_api_key, telegram_token, template, 
    }){
        this.generator = new QuestionGenerator(openai_api_key, template);
        this.bot = new TelegramBot(telegram_token, { polling: true });
        this.queue = new Map();
        this.queue_limit = 5;

        //  
        this.template = template;

        this.bot.on('message', (user_msg) => {
            const user_chat_id = user_msg.chat.id;
            let user_cmd = user_msg.text.toLocaleLowerCase();

            console.log(`[${user_chat_id}] user_cmd: ${user_cmd}`);

            if(user_cmd.includes('/generate')){
                this.generator.generate()
                    .then(question => {
                        //  new user (first time use)
                        if(!this.queue.has(user_chat_id))
                            this.queue.set(user_chat_id, [question]);
                        //  push the generate question to the end of specify user
                        else{
                            let arr = this.queue.get(user_chat_id) || [];

                            if(arr.length >= this.queue_limit)
                                arr.shift();
                            arr.push(question);

                            this.queue.set(user_chat_id, arr);
                        }
                        
                        this.bot.sendMessage(user_chat_id, question);
                    })
                    .catch(err => {
                        //  custom to user, error message
                        const err_msg = `Fail to call OpenAI GPT API for generate, with "${user_cmd}" command.`;
                        console.error(err);
                        console.log(err_msg);

                        this.bot.sendMessage(user_chat_id, err_msg);
                    });
            }
            else if(user_cmd.includes('/solution')){
                //  don't have this user generate question in queue
                if(!this.queue.has(user_chat_id))
                    this.bot.sendMessage(user_chat_id, `You need to generate your question first.`);
                else{
                    const answer = user_cmd.split("/solution")[1] || "";
                    //  get the latest question
                    const question = this.queue.get(user_chat_id).pop() || "";
                    
                    this.generator.solution({
                        question: question, 
                        answer: answer, 
                    })
                    .then(feedbacks => {
                        console.log(`feedbacks: ${feedbacks}`);

                        //  index of '{', for find the JSON format
                        const index = (feedbacks.indexOf('{') !== -1)? 
                            feedbacks.indexOf('{'): 0;
                        const json_str = feedbacks.substring(index);
                        
                        //  gpt reply format maybe not with JSON format
                        try{
                            const json = JSON.parse(json_str);
                            const { data, total_question } = json;
                            //  re-build the reply message
                            let reply_msg = "";
                            let arr_score = [];
                            
                            console.log(`json: `);
                            console.log(json);

                            //  count total score and fetch feedback
                            for(let i=0; i<data.length; i++){
                                reply_msg += `${i+1}) ${data[i]['gpt_answer']}\n(${data[i]['feedback']})\n`;
                                arr_score.push(data[i]['score']);
                            }

                            //  count the total score
                            const total_score = (arr_score.reduce((acc, cur) => acc + cur, 0) || 0) / total_question;
                            const total_score_str = (total_score * 100).toFixed(2) + " %";

                            reply_msg += `\n---------------------------${total_score_str} / 100.00 %`;

                            this.bot.sendMessage(user_chat_id, reply_msg);
                        }
                        //  unable parse JSON
                        catch(err){
                            console.error(err);
                            console.log(`Fail to parse string into json.`);

                            //  direct send the feedback
                            this.bot.sendMessage(user_chat_id, feedbacks);
                        }
                    })
                    .catch(err => {
                        //  custom to user, error message
                        const err_msg = `Fail to call OpenAI GPT API for solution.`;
                        console.error(err);
                        console.log(err_msg);

                        this.bot.sendMessage(user_chat_id, err_msg);
                    });
                }       
            }
        });
    }

    //  config template, replace parameters to value
    //  ex: ${level} → B1
    configTemplate(template = this.template.generate, options = this.getDefaultGenerate()){
        for(let prop in options){
             let regexp = new RegExp("\\${" + prop + "}", "gi");
            
            template = template.replace(regexp, options[prop]);
        }
        
        return template;
    }

    //  send the daily challenge to user
    daily_challenge(chat_id = 2040563117, options = this.getDefaultGenerate()){
        // let template = this.configTemplate();
        
        this.generator.generate(options)
            .then(generate => {
                
                this.bot.sendMessage(chat_id, generate);
            });
    }
}

module.exports = { LanguageBot };