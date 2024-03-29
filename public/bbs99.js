
//---
const pageconfig={};

const BBS_Configs={}; // func_iframeOnload()内で別ファイルから取得する


//---------------------------------------
let HtmlElement_myTableDiv = null;
async function func_iframeOnload(){ // iframeの親から、onloadイベントで呼び出される
    let urlOptionsAry = window.parent.getUrloptions(window.location.search);
    pageconfig.bbsCode = urlOptionsAry["b"]; // c_bbsCode; ;
    
    if(!pageconfig.bbsCode){
        let spary = window.location.pathname.split('/');
        for(let i=0;i<spary.length;i++){
            let pos = spary[i].indexOf(".html");
            if(pos>=0){
                pageconfig.bbsCode = spary[i].substring(0,pos);
                break;
            }
        }
    }
    if(pageconfig.bbsCode){
        pageconfig.FilenameCode = pageconfig.bbsCode.toLowerCase()
    }else{
        window.parent.changeIframeTarget_main("bbs",{});return;
    }
    
    const confAry = await import('./'+pageconfig.FilenameCode+'.js').catch(()=>{
        window.parent.changeIframeTarget_main("bbs",{});return;
    });
    if(confAry){
        if(confAry.PM_BBSconfigs){
            BBS_Configs.c_bbsCode = confAry.PM_BBSconfigs.c_bbsCode;
            if(!BBS_Configs.c_bbsCode) BBS_Configs.c_bbsCode = pageconfig.FilenameCode;
            
            BBS_Configs.HtmlElement_myTableDivId = confAry.PM_BBSconfigs.HtmlElement_myTableDivId;
            BBS_Configs.HtmlElement_myControllDivId = confAry.PM_BBSconfigs.HtmlElement_myControllDivId;
            BBS_Configs.HtmlElement_myNewDetailsDivId = confAry.PM_BBSconfigs.HtmlElement_myNewDetailsDivId;
            
            BBS_Configs.expandDirection = confAry.PM_BBSconfigs.expandDirection;
            if(!BBS_Configs.expandDirection) BBS_Configs.expandDirection= -1; // 0:順方向(古いものから)  -1:逆方向(新しいものから)
            BBS_Configs.expandNumber = confAry.PM_BBSconfigs.expandNumber;
            if(!BBS_Configs.expandNumber) BBS_Configs.expandNumber = 10;      // 1頁あたりの表示行数
            
            BBS_Configs.MaxDatasize_Title = confAry.PM_BBSconfigs.MaxDatasize_Title;
            if(!BBS_Configs.MaxDatasize_Title ) BBS_Configs.MaxDatasize_Title =100;
            BBS_Configs.MaxDatasize_overview = confAry.PM_BBSconfigs.MaxDatasize_overview;
            if(!BBS_Configs.MaxDatasize_overview ) BBS_Configs.MaxDatasize_overview =100;
            
            BBS_Configs.c_threadtypeAry = confAry.PM_BBSconfigs.c_threadtypeAry;
            if(!BBS_Configs.c_threadtypeAry) BBS_Configs.c_threadtypeAry = {proposal:"提案",question:"教えて",share:"共有",report:"報告"};
            
        }
    } 
    
    
    //---------
    window.parent.setEventOfButton_moveFramePage(document,"button_footprint01","home");
    window.parent.setEventOfButton_moveFramePage(document,"button_footprint02","bbs",{b:BBS_Configs.c_bbsCode});
    
    //---------
    dispBBSList();
    dispBBSControllBtn();
    
    //---------
    
    
    
    if(1==2){  mytest(); }
};

function moveFramePage(pagename,threadCode,bbsCode=BBS_Configs.c_bbsCode){
    let opt={};
    opt["b"]=bbsCode;
    opt["t"]=threadCode;
    window.parent.changeIframeTarget_main(pagename,opt);
}

// -------------------------------
let counterOfPageNumber = 0; // 表示頁数(最初は０)
// -------------------------------
async function dispBBSList(){
    let tgtElem = document.getElementById(BBS_Configs.HtmlElement_myTableDivId);
    if(!tgtElem){return;}
    
    
    const loginUser = window.parent.fb_getLoginUser();
    //const adminFlg = pageconfig.threadDocInfo.ownerids.indexOf(loginUser.email) >= 0;
    
    let strdbpath = "BulletinBoardList/"+BBS_Configs.c_bbsCode+"/threadList";
    
    
    
    let dispContents="";
    //----
    dispContents+="<table width=100%>";
    dispContents+="<tr> <th style='min-width:50px'>種別</th> <th style='min-width:100px'>タイトル</th> <th>担当</th> <th>内容</th> </tr>";
    
    let itempos = counterOfPageNumber * BBS_Configs.expandNumber; //1件目を0と数える
    let itemnumber = BBS_Configs.expandNumber;
    if(BBS_Configs.expandDirection<0){
        itempos = 0-itempos-1;
        itemnumber = 0-itemnumber;
    }
    let data = await window.parent.fb_getDataFromFirestoreDb( strdbpath ,itempos,itemnumber);
    let keylist=Object.keys(data);
    for(let key in keylist){
        const tgtdoc = data[keylist[key]];
        const adminFlg = ( tgtdoc.ownerids ? (tgtdoc.ownerids.indexOf(loginUser.email) >= 0) : false );
        const strH = tgtdoc.hideflg ? tgtdoc.hideflg :"";
        const flgDisp = ( strH ? adminFlg : 1 );
        
        dispContents += `<tr myinfo_pos="${keylist[key]}" myinfo_sort="${tgtdoc.sort}">`;
        
        let strT = strH;
        if(!strT) { 
            strT = tgtdoc.threadtype; 
            if(!strT) { strT=""; 
            }else{
                if(BBS_Configs.c_threadtypeAry){
                    if( strT in BBS_Configs.c_threadtypeAry){
                        strT = BBS_Configs.c_threadtypeAry[strT];
                    }
                }
            }
        }
        dispContents += `<td>${strT}</td>`;
        
        if(flgDisp){
            let strA =`<a href="javascript:moveFramePage('bbs_thread','${tgtdoc.primaryKey}')">${tgtdoc.title}</a>`;
            //let strA =`<input type="button" value="開く" onclick="moveFramePage('bbs_thread','${tgtdoc.primaryKey}')" />${tgtdoc.title}`;
            dispContents += `<td>${strA}</td>`;
            
            dispContents += `<td>${tgtdoc.ownername}</td>`;
            dispContents += `<td>${tgtdoc.overview}</td>`;
        }else{
            dispContents += `<td> - </td><td>${tgtdoc.ownername}</td><td> - </td>`;
        }
        
        dispContents += `</tr>`;
    }
    
    dispContents+="</table>";
    
    //----
    tgtElem.innerHTML ="";
    tgtElem.insertAdjacentHTML('beforeend', dispContents );
    //----
    
    let btn1 = document.getElementById("button_expandPageBackward");
    if(btn1){
        if(itempos==BBS_Configs.expandDirection){
            btn1.disabled = "disabled";
        }else{
            btn1.disabled = null;
        }
    }
    let btn2 = document.getElementById("button_expandPageForward");
    if(btn2){
        if(keylist.length==BBS_Configs.expandNumber){
            btn2.disabled = null;
        }else{
            btn2.disabled = "disabled";
        }
    }
    //----
}


function dispBBSControllBtn(){
    let tgtElem = document.getElementById(BBS_Configs.HtmlElement_myControllDivId);
    if(!tgtElem){return;}
    
    let dispContents="";
    //----
    dispContents+=`<input type="button" id="button_expandPageBackward" value="前ページ" onclick="func_expandPageNext(-1);" />`;
    dispContents+=`<input type="button" id="button_expandPageForward"  value="次ページ" onclick="func_expandPageNext(1);" /><br />`;
    
    
    dispContents+=`<input type="button" id="`+BBS_Configs.HtmlElement_myNewDetailsDivId+`_createBtn" value="スレッドを新規作成" onclick="open_createNewThread();" />`;
    
    
    //----
    tgtElem.innerHTML ="";
    tgtElem.insertAdjacentHTML('beforeend', dispContents );
}
function func_expandPageNext(directionFlg){
    counterOfPageNumber+=directionFlg;
    if(counterOfPageNumber<0)counterOfPageNumber=0;
    dispBBSList();
}











//---------------------------
function open_createNewThread(){

    let tgtElem_newInput = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId);
    if(tgtElem_newInput){
        let dispContents="";
        dispContents+=`<input type="text" id="`+BBS_Configs.HtmlElement_myNewDetailsDivId+`_ttl" name="title" maxlength="100" size="40" value="">`;
        dispContents+=`<textarea id="`+BBS_Configs.HtmlElement_myNewDetailsDivId+`_text1" style="width:100%; height:80px;"></textarea>`;
        dispContents+=`<input type="button" id="`+BBS_Configs.HtmlElement_myNewDetailsDivId+`_submitBtn" value="新規スレッド作成" onclick="createNewThread_submit();" />`;
        dispContents += `　<input type="button" value="入力を破棄して閉じる" onclick="createNewThread_hide();" />`;
        // ---
        tgtElem_newInput.innerHTML =dispContents;
        tgtElem_newInput.style.display ="block";
    }
    
    let tgtElem_BtnForOpen = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId+"_createBtn");
    if(tgtElem_BtnForOpen){
        tgtElem_BtnForOpen.disabled=true;
    }

}
function createNewThread_hide(){
    let tgtElem_newInput = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId);
    if(tgtElem_newInput){
        tgtElem_newInput.style.display ="none";
        //tgtElem_newInput.innerHTML="";
    }
    
    let tgtElem_BtnForOpen = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId+"_createBtn");
    if(tgtElem_BtnForOpen){
        tgtElem_BtnForOpen.disabled=false;
    }
}



async function createNewThread_submit(){
    let strMsg="";
    let ngflg=0;
    
    let docdata1={};
    // --------------------------
    let tgtElem_newInput;
    
    tgtElem_newInput = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId+"_ttl");
    if(!tgtElem_newInput){ ngflg=1; strMsg+="notFoundError：" + BBS_Configs.HtmlElement_myNewDetailsDivId+"_ttl \n"; }else{
        if(tgtElem_newInput.value==""){
            ngflg=1;strMsg+="タイトルを入力してください。\n";
        }else{
                docdata1.title = tgtElem_newInput.value.substring(0,BBS_Configs.MaxDatasize_Title );
        }
    }
    
    tgtElem_newInput = document.getElementById(BBS_Configs.HtmlElement_myNewDetailsDivId+"_text1");
    if(!tgtElem_newInput){ ngflg=1; strMsg+="notFoundError：" + BBS_Configs.HtmlElement_myNewDetailsDivId+"_overview \n"; }else{
        if(tgtElem_newInput.value==""){
            ngflg=1;strMsg+="概要を入力してください。\n";
        }else{
                docdata1.overview = tgtElem_newInput.value.substring(0,BBS_Configs.MaxDatasize_overview);
        }
    }
    // -----
    
    docdata1.hideflg = "作成中";
    docdata1.threadtype="";
    
    // --------------------------
    if(ngflg){
        //window.parent.fb_myconsolelog("[Info] 登録処理を中断："+strMsg);
        alert(strMsg);
        return null;
    }
    // -----------------------------------------------------------------------------
    
    const loginUser = window.parent.fb_getLoginUser();
    const strdbpath = "BulletinBoardList/"+BBS_Configs.c_bbsCode+"/threadList/"; 
    //------
    
    let docdata={};
    for(let key in docdata1){
        docdata[key]= window.parent.escapeHtml(docdata1[key]);
    }
    
    docdata.ownerids = [loginUser.email];
    docdata.ownername = loginUser.displayName;
    
    
    //------------------------------------------------------
    // ---------- 投稿する ------
    if(!confirm( "OK?"  )){
        return null;
    }
    // ----------
    let flgOk=0;
    try {
        let tryProcess =window.parent.fb_addDataToFirestore(strdbpath , docdata);
        let try1 = await tryProcess;
        if(try1!==null){ flgOk=try1; //refPath 
        }
    } catch(e){
        let msg="データの新規登録に失敗しました。";
        window.parent.fb_myconsolelog("[Error] : "+msg );
        setTimeout( function(){throw e;} );
        alert(msg);
        return null;
    }
    
    if(!flgOk){
        let msg="データの新規登録に失敗しました。";
        window.parent.fb_myconsolelog("[Error] : " + msg );
        alert(msg);
    }else{
        //------- 成功 ------
        
        createNewThread_hide();
        
        let tid= flgOk.id;
        if(tid){
            moveFramePage('bbs_thread',`${tid}`);
        }else{
            setTimeout(  dispBBSList  , 300);
        }
        
    }
    
}





// ============================================== 以下、テスト用 ==============
async function aa(){
    
    let data = await window.parent.fb_getDataFromFirestoreDb("BulletinBoardList/"+BBS_Configs.c_bbsCode+"/threadList",0,5);
    
    let keylist=Object.keys(data);
    alert(keylist.length);
    
}


async function bb(){
    let adddata={};
    
    adddata.ownerids = ["tkym@m3.kcn.ne.jp"];
    adddata.title = "たいとる";
    adddata.threadtype = "";
    adddata.ownername = "ほげ";
    adddata.overview = "ああああああああ";
    
    
    let dataPromise = window.parent.fb_addDataToFirestore("BulletinBoardList/"+BBS_Configs.c_bbsCode+"/threadList",adddata);
    
    let newdoc = await dataPromise;
    alert(newdoc);
    
}

//***********

function mytest(msg){
    // ----------for test--------
    // 名前 , 関数 , エレメントID , mode={0:中の末尾  1:並びの末尾(parentNode指定)  2:並びの次の位置},検索対象Document
    //window.parent.createHtmlElement_button("uuu","mytest()","forTest",0,this.document);
    HtmlElement_myTest = document.getElementById("forTest");
    if(HtmlElement_myTest){
        // 引数 { <input>ボタンのValue値、onclick値、挿入位置基準ElementID、挿入方法,document }
        window.parent.createHtmlElement_button("FireStore","aa()","forTest",0,document);
        window.parent.createHtmlElement_button("FireStore_add","bb()","forTest",0,document);
        
        window.parent.createHtmlElement_button("test01","window.parent.fb_fs_mytest_firestore(1);","forTest",0,document);
        window.parent.createHtmlElement_button("test02","window.parent.fb_fs_mytest_firestore(2);","forTest",0,document);
        window.parent.createHtmlElement_button("test03","window.parent.fb_fs_mytest_firestore(3);","forTest",0,document);
    }
}

//***********  Export ***************

window.func_iframeOnload = func_iframeOnload;

window.moveFramePage = moveFramePage;
window.func_expandPageNext = func_expandPageNext;
window.open_createNewThread = open_createNewThread;
window.createNewThread_submit = createNewThread_submit;
window.createNewThread_hide = createNewThread_hide;
