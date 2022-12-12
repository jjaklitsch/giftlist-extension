const Loading = ({ loaded }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
      {!loaded &&
        <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
      }
      {loaded &&
        <div className="success-checkmark" style={{ display: 'none' }}>
          <div className="check-icon">
            <span className="icon-line line-tip"></span>
            <span className="icon-line line-long"></span>
            <div className="icon-circle"></div>
            <div className="icon-fix"></div>
          </div>
        </div>
      }
    </div>
  )
}

export default Loading;
