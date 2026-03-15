let words = [];
let currentWord = null;
let wrongWords = [];

fetch("words.json")
.then(response => response.json())
.then(data => {
    words = data;
    startApp();
});

function startApp(){
    nextQuestion();
}

function nextQuestion(){

    const randomIndex = Math.floor(Math.random() * words.length);
    currentWord = words[randomIndex];

    document.getElementById("question").innerText = currentWord.meaning;
    document.getElementById("answer").value = "";
}

function checkAnswer(){

    const input = document.getElementById("answer").value.trim().toLowerCase();

    let correctList = [];

    if(Array.isArray(currentWord.word)){
        correctList = currentWord.word.map(w => w.toLowerCase());
    }else{
        correctList = [currentWord.word.toLowerCase()];
    }

    if(correctList.includes(input)){

        document.getElementById("result").innerText = "正解";

    }else{

        document.getElementById("result").innerText =
        "不正解 正解：" + correctList.join(" / ");

        wrongWords.push(currentWord);
    }
}

function next(){

    document.getElementById("result").innerText = "";
    nextQuestion();
}

function showWeak(){

    if(wrongWords.length === 0){
        alert("苦手単語はありません");
        return;
    }

    currentWord = wrongWords[Math.floor(Math.random()*wrongWords.length)];

    document.getElementById("question").innerText = currentWord.meaning;
}