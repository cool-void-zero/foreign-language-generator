const { Configuration, OpenAIApi } = require("openai");

/*
    - 詞彙 (Lexicon)：語言中的單詞，包括名詞、動詞、形容詞、副詞等。
        詞彙量：確定您想測試的詞彙量和難度水平，以及考慮目標學習者的程度和需要。
        詞義：確定每個詞彙的意義和用法，並確保練習涵蓋不同的詞義和語境。
        詞類：確定每個詞彙的詞性，並考慮不同詞類的使用和變化。
        範疇：確定每個詞彙的範疇，並考慮涵蓋不同主題和語言功能的詞彙。
        練習類型：選擇不同類型的練習，例如填空、選擇、翻譯和拼寫等。

    - 語法 (Syntax)：語言中單詞的排列和結構，以及它們如何形成句子和短語。
        知識點：確定要涵蓋的不同語法知識點，例如時態、人稱、數量、被動語態等。
        範疇：確定每個語法知識點的範疇，並考慮涵蓋不同主題和語言功能的語法。
        練習類型：選擇不同類型的練習，例如填空、改錯、選擇和翻譯等。

    - 語義 (Semantics)：語言中單詞和句子的意義。
        知識點：確定要涵蓋的不同語義知識點，例如詞義、詞語搭配、同義詞、反義詞等。
        範疇：確定每個語義知識點的範疇，並考慮涵蓋不同主題和語言功能的語義。
        練習類型：選擇不同類型的練習，例如選擇、翻譯和補全句子等。
*/

class QuestionGenerator{
    constructor(
        openai_api_key, 
        template = {
            generate: "", 
            solution: "", 
        }, 
        model = "gpt-3.5-turbo"
    ){
        this.openai = new OpenAIApi(new Configuration({
            apiKey: openai_api_key
        }));
        this.template = template;
        this.model = model;
    }

    configTemplate(template = "", options = {}){
        for(let prop in options){
            let regexp = new RegExp("\\${" + prop + "}", "gi");
            
            template = template.replace(regexp, options[prop]);
        }

        return template;
    }

    //  lexicon[詞彙], syntax[語法], semantics[語義]
    //  fill in[填充], radio[單選], translate[翻譯]
    generate({
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
        const system_template = this.configTemplate(this.template.generate, {
            native_language: native_language, 
            foreign_language: foreign_language, 
            level: level, 
            topic: topic, 
            type: type, 
            numbers: numbers, 
        });

        console.log(`[Generate] Final system_template: `);
        console.log(system_template);

        return new Promise(async (resolve, reject) => {
            try {
                const completion = await this.openai.createChatCompletion({
                    model: this.model, 
                    messages: [
                        { 
                            role: "system", 
                            content: system_template, 
                        }, 
                    ],
                });

                const generate_content = completion.data.choices[0].message.content;
                resolve(generate_content);
            }catch(err){
                reject(err);
            }
        });
    }

    solution({
        native_language = "English", 
        foreign_language = "English", 
        question = "", 
        answer = "", 
    }){
        // const system_template = this.template.solution.replace("${foreign_language}", foreign_language);
        const system_template = this.configTemplate(this.template.solution, {
            native_language: native_language, 
            foreign_language: foreign_language, 
        });

        console.log(`[Solution] Final system_template: `);
        console.log(system_template);

        return new Promise(async (resolve, reject) => {
            try {
                const completion = await this.openai.createChatCompletion({
                    model: this.model, 
                    messages: [
                        { 
                            role: "system", 
                            content: system_template, 
                        }, 
                        {
                            role: "assistant", 
                            content: question, 
                        }, 
                        {
                            role: "user", 
                            content: answer, 
                        }
                    ],
                });

                const solution_content = completion.data.choices[0].message.content;
                
                //  index of '{', for find the JSON format
                const index = (solution_content.indexOf('{') !== -1)? 
                    solution_content.indexOf('{'): 0;
                const json_str = solution_content.substring(index);
                //  
                const json = JSON.parse(json_str);
                resolve(json);
            }catch(err){
                // reject(err);
                console.error(err);
                console.log(`[generator solution] Fail to call API or parse json string.`);
                
                resolve({
                    data: [], 
                    total_question: 0, 
                });
            }
        });
    }
}

module.exports = { QuestionGenerator };