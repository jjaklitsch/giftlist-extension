import { LOGO, SHAKE_HAND } from "../constant";
import { useProductContext } from "../contexts/ProductContext";

const Header = ({ isAuthenticated }) => {
  const [context,  setContext] = useProductContext();
  const user = JSON.parse(localStorage.getItem('@user'));
  const handleLogout = () => {
    localStorage.removeItem('@access_token');
    localStorage.removeItem('@refresh_token');
    localStorage.removeItem('@user');
    context.isAuthencated = false;
    setContext({...context});
    window.location.reload();
  }

  return (
    <div className="giftlist_extension_popup_header" style={{ border: 'none' }}>
      <img src={LOGO} style={{ height: 18, width: 100 }} alt={'Logo'} />
      {isAuthenticated &&
        <div id="giftlist_extension_authenticated_header">
          <div style={{ display: 'flex', marginRight: 20 }}>
            <span style={{ fontSize: 15, lineHeight: '20px', color: '#101A34', marginRight: 5 }}>Hey <span id="giftlist_extension_logged_in_username">{user?.first_name + ' ' + user?.last_name}</span></span>
            <img src={SHAKE_HAND} className="selected-item-image" style={{ width: 20, height: 20 }} alt={'Shake'} />
          </div>
          <div style={{ fontWeight: 500, fontSize: 15, lineHeight: '18px', color: '#50BCD9', textDecoration: 'underline', cursor: 'pointer' }} id="giftlist_extension_logout_btn" onClick={handleLogout}>Logout</div>
        </div>
      }
    </div>
  )
}
export default Header;