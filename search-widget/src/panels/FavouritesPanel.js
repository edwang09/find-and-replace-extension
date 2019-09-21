import React from 'react';

import FontAwesome from 'react-fontawesome';
import Storage from '../Storage';

class FavouritesPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email : null,
      allow : false,
      redirecting:false
    }
    this.handleFavouriteRemoved = this.handleFavouriteRemoved.bind(this);
    this.handleFavouriteSelected = this.handleFavouriteSelected.bind(this);
    this.handleMonthlyPay = this.handleMonthlyPay.bind(this);
    // this.handleYearlyPay = this.handleYearlyPay.bind(this);
    this.cancelPay = this.cancelPay.bind(this);
  }
  componentWillMount(){
    let self = this
    chrome.storage.local.get(["subscribe"], data => {
      this.setState({allow:data.subscribe})
    });
    window.chrome.identity.getProfileUserInfo(function(userInfo) {
      self.setState({email:userInfo.email})
      fetch('https://us-central1-pay-gate-for-find-replace.cloudfunctions.net/payment/' + userInfo.email).then(r => r.json()).then(result => {
          // Result now contains the response text, do what you want...
          console.log(result)
          if (result.exists && result.subscription){
            self.setState({allow:true, subscription: result.subscription})
            chrome.storage.local.set({"subscribe":true});
          }else{
            self.setState({allow:false})
              chrome.storage.local.set({"subscribe":false});
          }
          console.log("email stored")
      })
      })
 
  }
  handleFavouriteSelected(id) {
    this.props.onFavouriteSelected(this.props.favourites[id]);
  }

  handleFavouriteRemoved(id) {
    Storage.setInFavourites(this.props.favourites[id], /* delete */ true);
  }
  handleMonthlyPay(e){
    e.preventDefault()
    this.setState({redirecting:true})
    if (this.state.email && this.state.email !== ""){
      const redirectURL = "https://pay-gate-for-find-replace.firebaseapp.com/checkout?ref=" + this.state.email
      window.chrome.tabs.create({url:redirectURL})
    }
  }
  // handleYearlyPay(e){
  //   e.preventDefault()
  //   this.setState({redirecting:true})
  //   if (this.state.email && this.state.email !== ""){
  //     const redirectURL = "https://pay-gate-for-find-replace.firebaseapp.com/checkoutyearly?ref=" + this.state.email
  //     window.chrome.tabs.create({url:redirectURL})
  //   }
  // }
  cancelPay(e){
    e.preventDefault()
    if (this.state.subscription && this.state.subscription){
      fetch('https://us-central1-pay-gate-for-find-replace.cloudfunctions.net/payment/delete/' + this.state.subscription.id
      ,{method : "POST"}).then(r => r.json()).then(result => {
          if (result.canceled){
            this.setState({subscription: result.confirmation})
          }else{
            console.log(result.err)
          }
      })
    }
  }
  render() {
    const noSavedFavouritesMessage = <div style={{ padding: '1em' }}>
        Currently you have no saved items.</div>;
    return (
      <div className="favourites-list">
        <div className="panel-title"><FontAwesome name='star' fixedWidth={true} /> Favourites</div>
        {(!this.state.email) && <p>Please login Chrome to enable this feature.</p>}
        {(!this.state.allow && this.state.email) &&
          <div>
          {!this.state.redirecting && <div>
            <p className="pay-text">Upgrade your account to use this feature. Upgrade cost $3.99 per month.</p>
            <button onClick={this.handleMonthlyPay} className="pay-button">Pay Monthly</button>
            {/* <button onClick={this.handleYearlyPay} className="pay-button">Pay for a year</button> */}
            </div>
          }
          {this.state.redirecting && <p className="pay-text">Redirecting to Checkout page please dont close extension ... </p>}
          </div>
        }
        {/* {(this.state.allow && this.state.subscription) && 
          <small className = "pay-info">
            Current subscription ends at
            {new Date(this.state.subscription.current_period_end*1000).toLocaleDateString("en-US")}, 
            {this.state.subscription.cancel_at_period_end ? 
            " subscription will not automatically renew." :
            " automatically renew on next billing cycle."}
            {!this.state.subscription.cancel_at_period_end && <span>
            Click to 
            <a onClick={this.cancelPay} href="#"> cancel subscription</a>
            </span>}
          </small>
        } */}
        {this.state.allow && <div>
          {Object.keys(this.props.favourites).length == 0 && noSavedFavouritesMessage}
          {Object.keys(this.props.favourites).sort().map(id => {
            const { findTextInput, replaceTextInput } = this.props.favourites[id];
            return (
              <div className="favourites-list-item" key={id}
                  onClick={() => this.handleFavouriteSelected(id)}>
                <span>
                  <span>{findTextInput}</span> <FontAwesome name='long-arrow-right' /> <span>{replaceTextInput}</span>
                </span>
                <span>
                  <FontAwesome className="favourites-list-item-remove" name='times'
                    onClick={(e) => {
                      e.stopPropagation();
                      this.handleFavouriteRemoved(id);
                    }} />
                </span>
              </div>
            );
          })}
        </div>}
      </div>
    );
  }

}

export default FavouritesPanel;
