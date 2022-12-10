// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getAuth, onAuthStateChanged ,reauthenticateWithCredential,EmailAuthProvider } from "firebase/auth";
import { createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut  } from "firebase/auth";
import { updatePassword , updateProfile ,sendEmailVerification } from "firebase/auth";
import { getDatabase ,ref as rtdb_ref, set as rtdb_set ,get as rtdb_get , update as rtdb_update
        , push as rtdb_push ,onValue as rtdb_onValue ,onDisconnect as rtdb_onDisconnect 
        , serverTimestamp as rtdb_serverTimestamp} from "firebase/database";
import { query as rtdb_query, orderByChild as rtdb_orderByChild ,orderByKey as rtdb_orderByKey
        ,equalTo as rtdb_equalTo,limitToLast as rtdb_limitToLast , startAt as rtdb_startAt,endAt as rtdb_endAt } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBROQ_Qz8e6TnrChFjHcjGdHzDKtRUhG1w",
  authDomain: "furutanidevelopperbbs.firebaseapp.com",
  databaseURL: "https://furutanidevelopperbbs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "furutanidevelopperbbs",
  storageBucket: "furutanidevelopperbbs.appspot.com",
  messagingSenderId: "95095493718",
  appId: "1:95095493718:web:603f613112231b026797f7",
  measurementId: "G-6KGR8VW757" ,
  databaseURL: "https://furutanidevelopperbbs-default-rtdb.asia-southeast1.firebasedatabase.app/"

};


//********** Initialize Firebase & import *****************
// Initialize Firebase  
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const rtdatabase = getDatabase();


const firebaseAuth = getAuth(app);
firebaseAuth.languageCode = 'jp';


//***************************
export { firebaseAuth, onAuthStateChanged ,reauthenticateWithCredential,EmailAuthProvider };
export { createUserWithEmailAndPassword , signInWithEmailAndPassword , signOut  };
export { updatePassword, updateProfile  ,sendEmailVerification   };
export { rtdatabase ,rtdb_ref, rtdb_set,rtdb_get , rtdb_update ,rtdb_push ,rtdb_onValue ,rtdb_serverTimestamp,rtdb_onDisconnect};
export { rtdb_query, rtdb_orderByChild ,rtdb_equalTo , rtdb_orderByKey,rtdb_limitToLast , rtdb_startAt,rtdb_endAt }
