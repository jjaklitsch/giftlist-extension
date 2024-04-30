import { useEffect, useRef, useState, useContext } from 'react';
import { goTo } from 'react-chrome-extension-router';
import {
  LoginSocialGoogle,
  LoginSocialFacebook,
} from 'reactjs-social-login';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { ERROR_ICON, EYE } from "../constant";
import { instance, setToken } from '../store/api';
import Home from './Home';

import AuthenticationContext from '../contexts/AuthenticationContext';
import { useProductContext } from '../contexts/ProductContext';


const Login = () => {
  let emailRef = useRef(null);
  let passwordRef = useRef(null);

  const { loading, isLoggedIn, signIn, signInWithProvider, signOut, error, cleanError } = useContext(AuthenticationContext);

  const [context] = useProductContext();

  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isMoving, setMoving] = useState(false);

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleEmailChange = (e) => {
    cleanError();
    setLoginInfo({ ...loginInfo, email: e.target.value });
  };

  const handlePasswordChange = (e) => {
    cleanError();
    setLoginInfo({ ...loginInfo, password: e.target.value });
  }

  const handleSignin = () => {
    signIn(loginInfo.email, loginInfo.password);
  };

  const handleForgotPassword = () => {
    window.parent.postMessage({ type: 'open', link: 'https://www.giftlist.com/forgot-password' }, '*');
  }

  const handleSignup = () => {
    window.parent.postMessage({ type: 'open', link: 'https://www.giftlist.com/sign-up' }, '*');
  }


  const onLogoutSuccess = () => {
    console.log('logout');
  }

  useEffect(() => {
    window.parent.postMessage({ type: 'resize-modal', width: '465px', height: '525px' }, "*");
  }, []);

  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header />
        {isMoving && (
          <Loading />
        )}
        {!isMoving && (
          <div className="giftlist-extension-login-content">
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
              <div style={{ display: 'flex', flex: 1 }} id="google_login_btn" onClick={() => signInWithProvider('google')}>
                <img src="/images/login_with_google.svg" style={{ width: '100%' }} alt={''} />
              </div>
              <div style={{ display: 'flex', flex: 1 }} id="facebook_login_btn" onClick={() => signInWithProvider('facebook')}>
                <img src="/images/login_with_facebook.svg" style={{ width: '100%' }} alt={''} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 20, justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', flex: 1, height: 1, backgroundColor: 'rgba(0, 9, 31, 0.08)' }}>
              </div>
              <span style={{ fontWeight: 'bold' }}> OR </span>
              <div style={{ display: 'flex', flex: 1, height: 1, backgroundColor: 'rgba(0, 9, 31, 0.08)' }}>
              </div>
            </div>
            <div className="extension-form-group">
              <label>Your email</label>
              <input type="text" ref={r => emailRef = r} onKeyUp={(e) => { if (e.keyCode === 13 && loginInfo.email) passwordRef.focus() }} placeholder="Enter your email" id="giftlist-extension-login-email" autoComplete="on" value={loginInfo.email} onChange={handleEmailChange} />
            </div>
            <div className="extension-form-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <input
                ref={r => passwordRef = r}
                type={showPassword ? "text" : "password"}
                onKeyUp={(e) => {
                  if (e.keyCode === 13 && loginInfo.email && loginInfo.password) {
                    handleSignin();
                  }
                  if (e.keyCode === 13 && !loginInfo.email) {
                    emailRef.focus();
                  }
                }}
                placeholder="Enter password"
                id="giftlist-extension-login-input"
                style={{ paddingRight: 20 }}
                autoComplete="on"
                value={loginInfo.password}
                onChange={handlePasswordChange}
              />
              <div style={{ position: 'absolute', right: 12, bottom: 6, zIndex: 2 }} id="show_password_btn" onClick={handleShowPassword}>
                <img src={EYE} style={{ width: 18, height: 18 }} alt={''} />
              </div>
            </div>
            {error &&
              <div className="extension-error-container" style={{ position: 'relative', height: 60 }}>
                <div style={{ 'position': 'absolute', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', top: 3 }}>
                  <div id="giftlist_extension_add_gift_error_message" style={{ width: '100%' }}>
                    <div id="giftlist_extension_add_gift_error_message_icon" style={{ display: 'flex' }}>
                      <img src={ERROR_ICON} style={{ width: 25, height: 25 }} alt={''} />
                    </div>
                    <div id="giftlist_extension_add_gift_error_title" style={{ fontSize: 12, background: '#FF574D' }}>
                      {error.message || error}
                    </div>
                  </div>
                </div>
              </div>
            }
            <div className="form-actions" style={{ marginTop: 24 }}>
              <button className="extension-btn" id="giftlist_sign_in" disabled={!loginInfo.email || !loginInfo.password || loading} onClick={handleSignin}>
                {loading &&
                  <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
                }
                Sign in
              </button>
              <a href="#" rel="noreferrer" onClick={handleForgotPassword} style={{ paddingTop: 15, paddingBottom: 20, fontWeight: 500, fontSize: 15, lineHeight: '20px' }}>Forgot password?</a>
              <span style={{ fontSize: 13, lineHeight: '16px' }}>New to GiftList? <a href="#" style={{ fontWeight: 'bold' }} rel="noreferrer" onClick={handleSignup}>Sign up</a></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;