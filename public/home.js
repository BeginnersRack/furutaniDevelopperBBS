// 引数 { <input>ボタンのValue値、onclick値、挿入位置基準ElementID、挿入方法 }
//createHtmlElement_button("Home","window.parent.changeIframeTarget_main('home')","",0);



function func_iframeOnload(){ // iframeの親から、onloadイベントで呼び出される

    window.parent.setEventOfButton_moveFramePage(document,"button01","bbs");
    
};


