// import {  firebaseAuth, onAuthStateChanged as firebase_onAuthStateChanged  
//        ,  reauthenticateWithCredential as firebase_reauthenticateWithCredential ,EmailAuthProvider as firebase_EmailAuthProvider } from "./FirebaseConfig.js";
// import {  createUserWithEmailAndPassword as firebase_createUserWithEmailAndPassword
//        , signInWithEmailAndPassword as firebase_signInWithEmailAndPassword
//        , signOut as firebase_signOut 
//        ,sendEmailVerification as firebase_sendEmailVerification 
//        ,updatePassword as firebase_updatePassword, updateProfile as firebase_updateProfile    } from "./FirebaseConfig.js";

// import { rtdatabase as firebaseRTDB_database ,ref as firebaseRTDB_ref, set as firebaseRTDB_set , update as firebaseRTDB_update ,push as firebaseRTDB_push ,onValue as firebaseRTDB_onValue,onDisconnect as firebaseRTDB_onDisconnect  ,serverTimestamp as firebaseRTDB_serverTimestamp  } from "./FirebaseConfig.js";// ----------

import { firestoredatabase , fsdb_collection, fsdb_doc ,fsdb_getDoc , fsdb_onSnapshot , fsdb_query, fsdb_where, fsdb_getDocs ,fsdb_orderBy, fsdb_limit} from "./FirebaseConfig.js";
import { fsdb_enableIndexedDbPersistence , fsdb_getDocFromCache } from "./FirebaseConfig.js";
import { fsdb_setDoc, fsdb_addDoc, fsdb_updateDoc ,fsdb_deleteDoc ,fsdb_serverTimestamp ,fsdb_runTransaction } from "./FirebaseConfig.js";

import { putdataToIndexedDb , getdataFromIndexedDb ,getKeysFromIndexedDb , removedataFromIndexedDb } from "./myfunc_indexeddb.js";

import { getServerTimeFromRTDB } from "./myfunc_getlog.js";
import { myconsolelog ,createPromise_waitDeleteKey } from "./myfunc_common.js";



//*********** my variables ****************

const indexedDbName = "furutaniBBS";
const dataBlock_length=2;
const indexedDb_keyName_BlockAry ="BlockAry"; // {startval:0,lastmodified:(datetime)}の配列。startvalはDBのsort値
const firestoreDb_colName_system =""; // cf)"/sys/system"
const firestoreDb_keyName_system ="_system";

const listenerAry={};  // firestoreのＤＢに対する、各ブロックごとのListenerRemove用関数
// listenerAry[refPath]={startPosition:ListenerRemoveFunction}  および  {"additional":ListenerRemoveFunction}

const maxSortIndexAry={};  //   firestoreＤＢの指定パスにおける、現時点での[sort]列値の最大値。
// maxSortIndexAry[refPath]=number;



//*********** main ****************

async function getDataFromFirestoreDb(refPath , startpos,datalength){
    if(!refPath){ return null;}
    if(!datalength){ return null;}
    
    let posMin;
    let posMax;
    let incrim=0;
    let cntBlock=0;
    let cntpos;
    if(datalength>0){
        incrim=1;
        cntBlock=0;
        posMin=startpos;
        posMax=startpos+datalength-1;
        if(posMin<0){if(posMax>=0){ posMax=-1; }}
        cntpos=-1;//スタート位置0の1つ前
    } else {
        incrim=-1;
        cntBlock=-1;
        posMax=startpos;
        posMin=posMax+datalength+1;
        if(posMax>=0){if(posMin<0){ posMin=0; }}
        cntpos=0;//スタート位置-1の1つ前
    }
    
    myconsolelog(`[Info] required firestore data ( ${posMin}-${posMax} ) : ${refPath}`);
    
    //---
    let ans={};
    
    let cntBlock_bk=null;
    let continueFlg=1;
    do{
        let param3 = await getDataBlock(refPath,cntBlock);
        if(!param3){
            myconsolelog("[Error] firestoreからデータを取得できませんでした : "+cntBlock.toString()+" "+refPath);
            return ans;
        } // [requestSortIndex,startPosition,endPosition]
        
        if(cntBlock_bk==param3[0]){
            continueFlg=0;
        }else{
            cntBlock=param3[0];
            let dataary = await getKeysFromIndexedDb(indexedDbName,refPath,param3[1],param3[2] , (incrim==-1) );
            if(!dataary){
                myconsolelog("[Error] indexedDBからデータを取得できません："+refPath);
                continueFlg=0;
            } else {
                if(dataary.length==0){
                    continueFlg=0;
                }else{
                    for(let keys of dataary){
                        cntpos+=incrim;
                        if((cntpos>=posMin)&&(cntpos<=posMax)){
                            ans[cntpos] = await getdataFromIndexedDb(indexedDbName,refPath, keys[1] );
                            ans[cntpos].primaryKey=keys[1];
                        }
                    }
                }
            }
            let needNextFlg = (incrim==1)?(cntpos<posMax):(cntpos>posMin);
            if(needNextFlg){
                cntBlock_bk=cntBlock;
                cntBlock+=incrim;
                if(cntBlock<0)continueFlg=0;
            }else{
                continueFlg=0;
            }
        }
    } while (continueFlg);
    
    return ans;
}


//*********** my functions ****************




async function getDataBlock(refPath,requestSortIndexBlockNum0=-1){ 

    
    let additionalFlg=true;
    if(listenerAry){if(listenerAry[refPath]){additionalFlg = (typeof (listenerAry[refPath].additional)!="function");}}
    if(additionalFlg){
        let flg=init_getDataFromFirestore(refPath); 
        if(!flg){ return null; }
    }
    
    // ブロック境界データの取得
    let limitsortAry= await getdataFromIndexedDb(indexedDbName,refPath,indexedDb_keyName_BlockAry); //(dbname,storeName,key)
     // {startval:0,lastmodified:(datetime)}の配列。
     // 各ブロックの境界値。Ary[0]は最初のブロックの最前値。lastmodifiedはこのブロックのデータの最後の確認日時を記録。
     // indexdbに保管し取得する。：未実装
    if(!limitsortAry){
        limitsortAry=[];
        limitsortAry[0]={startval:0,lastmodified:0};
    }
    
    let maxIndx=maxSortIndexAry[refPath]; // 現時点でのsort値の最大値を取得する
    if(typeof maxIndx != "number"){
            //let allLength=getDataCount(refPath);
            maxIndx = await getMaxOfSortIndex(refPath);
            if(typeof maxIndx =="number"){
                maxSortIndexAry[refPath] = maxIndx;
                myconsolelog("[Info] sort値の現時点最大値をfirestoreから取得："+maxIndx.toString() );
            }else{
                myconsolelog("[Error] sort値の現時点最大値をfirestoreから取得できませんでした : "+refPath);
            }
    }
    if(typeof maxIndx != "number"){ 
        myconsolelog("[Error] cannot get maxIndx or maxSortIndexAry");
        return null; 
    }
    let maxBlockNum = (((maxIndx)/dataBlock_length) | 0); 
    
    
    //let blocknum = ((requestSortIndex/dataBlock_length) | 0); // 取得対象となるブロックの個数目。先頭が0個目。
    let requestSortIndexBlockNum=(requestSortIndexBlockNum0 | 0); //小数点以下切捨
    let blocknum=requestSortIndexBlockNum;
    if(requestSortIndexBlockNum<0){
        blocknum = requestSortIndexBlockNum+maxIndx+1;
        if(blocknum<0)blocknum=0;
    }
    if(blocknum>maxBlockNum)blocknum=maxBlockNum;
    
    let startPosition = blocknum * dataBlock_length;
    let endPosition = startPosition+dataBlock_length;
    
    for(let i=limitsortAry.length;i<=blocknum;i++){
        limitsortAry[i]={startval:i * dataBlock_length,lastmodified:0};
    }
    
    // --
    
    myconsolelog(`[Info] required firestore data : block ${blocknum} (sortIndex ${startPosition}-${endPosition})`);
    
    // --
    let BlockListenerRemove = null;
    if(listenerAry[refPath]){
        BlockListenerRemove =listenerAry[refPath][startPosition];
    }
    if(typeof BlockListenerRemove=="function"){ // indexdbにデータあるならばそこから取得するべし。
        myconsolelog(`[Info] block ${blocknum} already stored by indexedDB.`);
        return ([blocknum,startPosition,endPosition]);
    }
    
    // ---------------------------------------------
    //firestoreから取得する。
    let waitPromise = createPromise_waitDeleteKey( getDataBlock_wait , refPath+"_"+startPosition.toString() ); //indexedDBへのデータ登録完了を待機
    
    if(!listenerAry[refPath]) listenerAry[refPath]={};
    (listenerAry[refPath])[startPosition] = setDataBlockListener(refPath,startPosition,endPosition);
    
    await waitPromise.catch(function(strinfo){
        myconsolelog(`[Warning] indexedDBへの更新待機がtimeoutしました : ${strinfo}`);
    });
    // -----
    return ([blocknum,startPosition,endPosition]);
}
let getDataBlock_wait={};



async function init_getDataFromFirestore(refPath){ 
    
    myconsolelog(`[Info] called : init_getDataFromFirestore()`);
    
    let limitsortAry= await getdataFromIndexedDb(indexedDbName,refPath,indexedDb_keyName_BlockAry); //(dbname,storeName,key)
     // {startval:0,lastmodified:(datetime)}の配列。
     // 各ブロックの境界値。Ary[0]は最初のブロックの最前値。lastmodifiedはこのブロックのデータの最後の確認日時を記録。
     // indexdbに保管し取得する。：未実装
    if(!limitsortAry){
        limitsortAry=[];
        limitsortAry[0]={startval:0,lastmodified:0};
    }
    
    let maxIndx=maxSortIndexAry[refPath]; // 現時点でのsort値の最大値を取得する
    if(typeof maxIndx != "number"){
            maxIndx = await getMaxOfSortIndex(refPath);
            if(typeof maxIndx =="number"){
                maxSortIndexAry[refPath] = maxIndx;
                myconsolelog("[Info] sort値の現時点最大値をfirestoreから取得："+maxIndx.toString() );
            }else{
                myconsolelog("[Error] sort値の現時点最大値をfirestoreから取得できませんでした : "+refPath);
            }
    }
    if(typeof maxIndx != "number"){ 
            myconsolelog("[Error] cannot get maxIndx or maxSortIndexAry");
            return null; 
    }
    
    // 現時点での最後(最新)のブロックの、次のブロックを用意する。
    let blocknum = ((maxIndx/dataBlock_length) | 0)+1; // 対象となるブロックの個数目。先頭が0個目。
    let startPosition = blocknum * dataBlock_length;
    let endPosition = startPosition+dataBlock_length;
    
    for(let i=limitsortAry.length;i<=blocknum;i++){
        limitsortAry[i]={startval:blocknum * dataBlock_length,lastmodified:0};
    }
    
    //--
    let BlockListenerRemove = null;
    if(listenerAry[refPath]){
        BlockListenerRemove =listenerAry[refPath].additional;
    }
    if(typeof BlockListenerRemove=="function"){ 
        myconsolelog("[Warning] fireStore取得処理の新ブロックリスナー(additional)は、すでに設定されています : "+startPosition.toString()+" "+refPath);
        return null
    }
    
    // ---------------------------------------------
    // 新ブロック発生時の処理(リスナー)を作成する。
    
    //listenerAry[refPath].additional = setDataBlockListener(refPath,startPosition,null,true);
    remakeAdditionalListener(refPath,startPosition)
    
    //----------
    return true;
}




function setDataBlockListener(refPath,startPosition,endPosition=null , removeflg=false){ //返値は、リスナー解除関数
    if(typeof endPosition == "number"){
       if(endPosition==0) endPosition = startPosition + dataBlock_length;
    }
    
    myconsolelog(`[Info] set listener for fireStore data : sortIndex (${startPosition}-${endPosition?endPosition:""}) ${removeflg?"!":""}: ${refPath}`);
    
    const tgtRef = fsdb_collection(firestoredatabase , refPath);
    let tgtquery;
    if(endPosition){
        tgtquery = fsdb_query(tgtRef, fsdb_orderBy("sort","asc"), fsdb_where("sort", ">=", startPosition), fsdb_where("sort", "<", endPosition));
    }else{
        tgtquery = fsdb_query(tgtRef, fsdb_orderBy("sort","asc"), fsdb_where("sort", ">=", startPosition) );
    }
    
    if(!listenerAry[refPath]){
        listenerAry[refPath] = {};
    }
    //ans=await getDataBlockFromFirestore(tgtquery);
    return fsdb_onSnapshot(tgtquery, function(querySnapshot){
        
        myconsolelog(`[Info] fsdb_onSnapshot (${startPosition}) : ${refPath}`);
        
        let promiseAry = [];
        
        querySnapshot.docChanges().forEach((change) => {
            let tgtdoc=change.doc;
            let tgtpath = tgtdoc.ref.path;
            let tgtparentPath = tgtpath.slice(0, 0-(tgtdoc.id.length)-1);
            myconsolelog("[event]firestore:"+change.type+":"+tgtpath);
            switch(change.type){
                case "added":
                case "modified":
                    promiseAry.push(
                        putdataToIndexedDb(indexedDbName, tgtparentPath ,tgtdoc.id, tgtdoc.data(),1)
                    );
                    break;
                case "removed":
                    promiseAry.push(
                        removedataFromIndexedDb(indexedDbName, tgtparentPath ,  tgtdoc.id )
                    );
                    break;
            }
        });
        Promise.allSettled(promiseAry).then(async function(values){
            if(values.length>0){
                let existDocFlg=0;
                let lastModifiedTime=0;
                for(let res of values){
                    switch(res.status){
                        case "fulfilled":
                            let docdata = res.value;
                            if(docdata.modified_sys) {
                                if(docdata.modified_sys>lastModifiedTime) lastModifiedTime = docdata.modified_sys; 
                            }
                            if(docdata.sort){if(typeof docdata.sort == "number"){
                                if((typeof (maxSortIndexAry[refPath]) != "number")||(docdata.sort>maxSortIndexAry[refPath])){
                                    maxSortIndexAry[refPath]=docdata.sort;
                                }
                            }}
                            existDocFlg++;
                            break;
                        case "rejected":
                            let err = res.reason;
                            myconsolelog(`[Error] IndexedDB : try put : ${err.name} : ${err.message}`);
                            break;
                    }
                }
                if(existDocFlg){
                    if(!lastModifiedTime){lastModifiedTime=getServerTimeFromRTDB();}
                    let limitsortAry= await getdataFromIndexedDb(indexedDbName,refPath,indexedDb_keyName_BlockAry);
                    let blocknum=-1;
                    if(limitsortAry){
                        for (let i of Object.keys(limitsortAry)){
                            if(limitsortAry[i].startval==startPosition) {
                                blocknum=i;
                                break;
                            }
                        }
                    }else{
                        limitsortAry={};
                    }
                    if(blocknum<0){
                        blocknum = ( startPosition/dataBlock_length )|0;
                        if(limitsortAry[blocknum]){
                            myconsolelog(`[ERROR] limitsortAry : blocknum Duplex occured. ${limitsortAry[blocknum].startval}⇒${startPosition}`);
                        }else{
                            limitsortAry[blocknum]={};
                            limitsortAry[blocknum].startval = startPosition;
                        }
                    }
                    limitsortAry[blocknum].lastmodified = lastModifiedTime;
                    putdataToIndexedDb(indexedDbName,refPath,indexedDb_keyName_BlockAry , limitsortAry,true); // limitsortAry を indexedDBに保存
                    
                    if(removeflg){
                        setTimeout(remakeAdditionalListener  , 0 , refPath,startPosition);
                    }
                }
            }
            
            delete getDataBlock_wait[refPath+"_"+startPosition.toString()];
            
        });
        
    });
    
}
function remakeAdditionalListener(refPath,startPosition){
    if(listenerAry){
        if(listenerAry[refPath]){if(typeof (listenerAry[refPath].additional)=="function"){
            listenerAry[refPath].additional(); // endPosition無しのリスナーを削除
            listenerAry[refPath].additional=null;
            myconsolelog("[Info] fireStore取得処理の新ブロックリスナー(additional)を削除");
        }}
    }else{
        listenerAry={};
    }
    if(!listenerAry[refPath])listenerAry[refPath]={};
    
    let maxsortIndex = maxSortIndexAry[refPath];
    
    while(startPosition<=maxsortIndex){
        let endPosition = startPosition + dataBlock_length;
        listenerAry[refPath][startPosition] = setDataBlockListener(refPath,startPosition,endPosition);
        myconsolelog(`[Warning] indexedDB block size expanded! ${startPosition} ～ ${endPosition}`);
        startPosition = endPosition;
    }
    
    listenerAry[refPath].additional = setDataBlockListener(refPath,startPosition,null,true);
    myconsolelog("[Info] fireStore取得処理の新ブロックリスナー(additional)を設定");
}





async function getDataCount(refPath,q_fieldname="",q_condition="",q_value=""){
    let ans=0;
    
    try {
        const tgtRef = fsdb_collection(firestoredatabase , refPath);

        if(q_fieldname){
            const q = fsdb_query( tgtRef , fsdb_where(q_fieldname, q_condition, q_value));
            const snapshot = await getCountFromServer(q);
        }else{
            const snapshot = await getCountFromServer(tgtRef);
        }
        ans = snapshot.data().count;
        myconsolelog(`[Info] fireStore : getDataCount=${ans} ${q_fieldname} ${q_condition} ${q_value} in ${refPath}`);
    } catch (e) {
        myconsolelog("Error getting count document:"+ e);
    }
    
    return ans;
}



let aryMaxOfSortIndex={};
async function getMaxOfSortIndex_recalc(refPath){
    let ans=null;
    
    myconsolelog("[Info] try re-calc MaxOfSortIndex : "+refPath);
    
    try {
        const tgtRef = fsdb_collection(firestoredatabase , refPath);
        
        let tgtquery = fsdb_query(tgtRef, fsdb_orderBy("sort","desc"), fsdb_limit(1) );
        
        let querySnapshot = await fsdb_getDocs(tgtquery);
        //if (querySnapshot.exists()) {
        querySnapshot.forEach(function(doc){
            ans = doc.data().sort;
        });
        myconsolelog(`[Info] fireStore : getMaxOfSortIndex=${ans} in ${refPath}`);
    } catch (e) {
        myconsolelog("Error at getting Max-sort-index document:"+ e);
    }
    
    return ans;
}
async function getMaxOfSortIndex(refPath){
    let flg=1;
    if(arySystemDocListenerRemoveFunc[refPath]){
        if(typeof (arySystemDocListenerRemoveFunc[refPath])=="function"){
            flg=0;
        }
    }
    if(flg){
        let sysdata = await setListener_threadSystemDoc(refPath);
        if(sysdata){if(sysdata.sortIndex_Max){
            return sysdata.sortIndex_Max;
        }}
    }
    
    if(aryMaxOfSortIndex[refPath]){
        return aryMaxOfSortIndex[refPath];
    }else{
        myconsolelog("[Error] fireStore getMaxOfSortIndex取得に失敗 : "+refPath);
        return null;
    }
}

let arySystemDocListenerRemoveFunc={};
async function setListener_threadSystemDoc(refPath){
    
    // --- 既存リスナーを削除
    if(arySystemDocListenerRemoveFunc[refPath]){
        if(typeof (arySystemDocListenerRemoveFunc[refPath])=="function"){
            arySystemDocListenerRemoveFunc[refPath]();
            arySystemDocListenerRemoveFunc[refPath]=null;
            myconsolelog("[Info] fireStore SystemDocリスナーを削除: "+refPath);
        }
    }
    
    // --- Doc取得
    const tgtRef = fsdb_doc(firestoredatabase , refPath+firestoreDb_colName_system,firestoreDb_keyName_system);
    const docSnap = await fsdb_getDoc(tgtRef);
    
    let docdata={};
    if (docSnap.exists()) {
        let tgtdoc = docSnap.data();
        
        //--- systemパラメータを取得
        docdata.sortIndex_Max = tgtdoc.sortIndex_Max;
        
        
    } else {
        myconsolelog("[Info] fireStore SystemDoc新規作成 : "+refPath);
        
        createSystemDoc(refPath);
        
    }
    
    
    // --- リスナーを設定する
    arySystemDocListenerRemoveFunc[refPath] = fsdb_onSnapshot(tgtRef, function(Snapshot){
        let localshotflg = Snapshot.metadata.hasPendingWrites
        myconsolelog(`[Info] fsdb_onSnapshot (${firestoreDb_keyName_system}) ${localshotflg?"local":"server"} : ${refPath+firestoreDb_colName_system}`);
        if( !localshotflg ){
            let sysdoc = Snapshot.data();
            
            //--- systemパラメータを取得
            aryMaxOfSortIndex[refPath] = sysdoc.sortIndex_Max;
            
            
        };
        
    });
    
    
    return docdata;
}

async function createSystemDoc(refPath){
        
        //--- systemパラメータを取得
        let docdata={};
        let sortIndexMax = await getMaxOfSortIndex_recalc(refPath);
        if(!sortIndexMax) sortIndexMax=0;
        docdata.sortIndex_Max = sortIndexMax;
        
        
        addDataToFirestore( refPath+firestoreDb_colName_system+"/"+firestoreDb_keyName_system , docdata);
        
        return docdata;
}

async function createNewSortIndex(refPath){
    let NewSortIndex=-1;
    myconsolelog("[Info] try createNewSortIndex to firestore : "+refPath);
    
    const tgtRef = fsdb_doc(firestoredatabase , refPath+firestoreDb_colName_system,firestoreDb_keyName_system);
    try {
        NewSortIndex = await runTransaction(firestoredatabase, async function(transaction){
            const sfDoc = await transaction.get(tgtRef);
            if (!sfDoc.exists()) {
                return Promise.reject(-1);
            }
            
            let oldIndex = sfDoc.data().sortIndex_Max;
            let newIndex = (oldIndex+1)|0;
            
            transaction.update(tgtRef, { sortIndex_Max: newIndex });
            return newIndex
        }).catch(async function(rejectParam){
            NewSortIndex = rejectParam;
            let docdata = await createSystemDoc(refPath);
            if(docdata){if(typeof docdata.sortIndex_Max =="number"){
                NewSortIndex = docdata.sortIndex_Max;
            }}
        });
        myconsolelog(`[Info] fireStore SortIndex update to ${NewSortIndex} : ${refPath}`);
    } catch (err) {
        myconsolelog(`[Error] fireStore SortIndex update : ${refPath} : ${err}`);
    }
    
    return NewSortIndex;
}



//---------- 
    
async function addDataToFirestore(refPath , orgdata){ 
    myconsolelog("[Info] try add to firestore : "+refPath);
    
    const tgtRef = fsdb_collection(firestoredatabase , refPath);
    let tgtdata = {};
    for (const [key, value] of Object.entries(orgdata)) {
        tgtdata[key] = value;
    }
    //---
    tgtdata.sort = await createNewSortIndex(refPath);
    tgtdata.modified_sys = fsdb_serverTimestamp();
    tgtdata.modified = fsdb_serverTimestamp();
    tgtdata.created = fsdb_serverTimestamp();
    
    try {
        return fsdb_addDoc(tgtRef, tgtdata );
    } catch (e) {
        myconsolelog("[Error] cannot add documents : "+ e);
        return null;
    }
}
async function updateDataOnFirestore(refPath ,dockey , orgdata ,modifiedTimeFlg=true){
    myconsolelog("[Info] try update to firestore : "+refPath+" "+dockey);
    
    orgdata.modified_sys = fsdb_serverTimestamp();
    if(modifiedTimeFlg){
        orgdata.modified = fsdb_serverTimestamp();
    }
    //---
    const tgtRef = fsdb_doc(firestoredatabase , refPath,dockey);
    try {
        return fsdb_updateDoc(tgtRef, orgdata );
    } catch (e) {
        myconsolelog("[Error] cannot update documents : "+ e);
        return null;
    }
}

async function deleteDataOnFirestore(refPath ,dockey){
    myconsolelog("[Info] try delete to firestore : "+refPath+" "+dockey);
    
    const tgtRef = fsdb_doc(firestoredatabase , refPath,dockey);
    try {
        return fsdb_deleteDoc(tgtRef);
    } catch (e) {
        myconsolelog("[Error] cannot delete documents : "+ e);
        return null;
    }
}


// --- 以下、廃止--------

async function getDataBlockFromFirestore(tgtquery){
    let ans={};
    try {
        const querySnapshot = await fsdb_getDocs(tgtquery);
        querySnapshot.forEach((doc) => {
          let onedata={};
          //onedata[id]=doc.id;
          onedata["sort"]=doc.data().sort;
          onedata["title"]=doc.data().title;
          onedata["modified"]=doc.data().modified;
          
          ans[doc.id]=onedata;
        });
    } catch (e) {
        myconsolelog("[Error] cannot get documents : "+ e);
    }
    
    return ans;
}



//=============================================
// ------ for test -----------
async function mytest01(){

    //const boardsRef = fsdb_collection(firestoredatabase , "BulletinBoardList");
    const docRef = fsdb_doc(firestoredatabase, "BulletinBoardList", "BBS01");

    let docSnap;
    try { // キャッシュ使用には、configでenableIndexedDbPersistence()宣言が必要
        docSnap = await fsdb_getDocFromCache(docRef);
        console.log("Cached document data:", docSnap.data());
    } catch (e) {
        console.log("Error getting cached document:", e);
    }
    try {
        docSnap = await fsdb_getDoc(docRef);
        console.log("get document data:", docSnap.data());
    } catch (e) {
        console.log("Error getting document:", e);
    }
    
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      // doc.data() will be undefined in this case
      console.log("No such document!");
    }
    
}

let test_unsubscribe;
function mytest02(){
    const boardsRef = fsdb_collection(firestoredatabase , "BulletinBoardList/BBS01/threadList");
    const q = fsdb_query( boardsRef , fsdb_where("sort", "!=", "CA"));
    test_unsubscribe = fsdb_onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        let myinfo="("+change.oldIndex+"->"+change.newIndex+")";
        if (change.type === "added") {
            console.log("New data: ", change.doc.data()+" "+myinfo);
        }
        if (change.type === "modified") {
            console.log("Modified data: ", change.doc.data()+" "+myinfo);
        }
        if (change.type === "removed") {
            console.log("Removed data: ", change.doc.data()+" "+myinfo);
        }
        
        //test_unsubscribe();
      });
    });

}

function mytest(mycase){
    switch(mycase){
      case 1:
        mytest01();
        break;
      case 2:
        mytest02();
        break;
      case 3:
        (async function(){
            let myPromise = setDataBlockListener("BulletinBoardList/BBS01/threadList",-1.2);
            let posAry = await myPromise; 
            let i=0;
        })();
        break;
      
      case "waitFunc":
        return createPromise_waitDeleteKey;
        break;
      default:
        alert("?");
    }
}

//***********  Export ***************
window.fb_getDataFromFirestoreDb = getDataFromFirestoreDb;
window.fb_addDataToFirestore = addDataToFirestore;
window.fb_updateDataOnFirestore = updateDataOnFirestore;
window.fb_deleteDataOnFirestore = deleteDataOnFirestore;

//---
window.fb_fs_mytest_firestore = mytest;
// export { mytest01 };
