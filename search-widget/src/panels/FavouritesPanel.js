import React from 'react';

import FontAwesome from 'react-fontawesome';
import Storage from '../Storage';
import Analytics from '../Analytics';

class FavouritesPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email : null,
      premium : false,
      bundleCreation : false,
      checkedItem:[],
      redirecting:false
    }
    this.handleFavouriteRemoved = this.handleFavouriteRemoved.bind(this);
    this.handleFavouriteSelected = this.handleFavouriteSelected.bind(this);
    this.handlePay = this.handlePay.bind(this);
    // this.handleYearlyPay = this.handleYearlyPay.bind(this);
    this.cancelPay = this.cancelPay.bind(this);
    this.toggleBundleCreation = this.toggleBundleCreation.bind(this);
    this.handleCheckbox = this.handleCheckbox.bind(this);
    this.handleBundleCreation = this.handleBundleCreation.bind(this);
    this.handleReplaceAll = this.handleReplaceAll.bind(this);
    this.handleReplaceAllBundle = this.handleReplaceAllBundle.bind(this);
  }
  componentWillMount(){
    let self = this
    console.log(this.props.favourites)
   
    chrome.storage.local.get(["premium"], data => {
      this.setState({premium:data.premium})
    });
    window.chrome.identity.getProfileUserInfo(function(userInfo) {
      self.setState({email:userInfo.email})
    })
 
  }
  handleFavouriteSelected(id) {
    if(!this.state.bundleCreation){
      this.props.onFavouriteSelected(this.props.favourites[id]);
    }
  }
  handleReplaceAll(id){
    if(!this.state.bundleCreation){
      this.props.onReplaceAll(this.props.favourites[id]);
    }
  }

  handleReplaceAllBundle(id){
    if(!this.state.bundleCreation && this.props.favourites[id] && this.props.favourites[id].length>1){
      this.props.favourites[id].map((fav)=>{
        console.log(fav)
        this.props.onReplaceAll(fav);
      })
    }
  }

  handleFavouriteRemoved(id) {
    Storage.setInFavourites(this.props.favourites[id], /* delete */ true);
  }
  handleunBundle(id){
    console.log(this.props.favourites[id])
    Storage.unbundleFavourites(this.props.favourites[id]);
  }
  handlePay(e){
    e.preventDefault()
    Analytics.sendEvent("payment-click", this.state.email)
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
  toggleBundleCreation(e){
    e.preventDefault()
    console.log(this.state.bundleCreation)
    this.setState({bundleCreation: !this.state.bundleCreation, checkedItem: Object.keys(this.props.favourites)
      .filter(id=> id.substr(0,6)!=="bundle")
      .map(id=>{
      return false
    })})
  }

  handleCheckbox(e) { 
    const newCheckedItem = this.state.checkedItem.map((item, idx)=>{
      if (idx == e.target.name){
        return !item
      }else{
        return item
      }
    })
    this.setState({checkedItem: newCheckedItem});
  }
  handleBundleCreation(e){
    e.preventDefault()
    console.log(this.state.checkedItem)
    const bundlelist = Object.keys(this.props.favourites)
    .filter(id=> id.substr(0,6)!=="bundle")
    // .sort()
    .filter((id, idx)=>{
      return this.state.checkedItem[idx]
    })
    console.log(bundlelist)
    const bundle = bundlelist.map((id, idx)=>{
      return this.props.favourites[id]
    })
    console.log(bundle)
    if (bundle && bundle.length > 1){
      Storage.bundleFavourites(bundle);
      this.setState({bundleCreation: false})
    }else{
      this.setState({bundleCreation: false})
    }
  }
  render() {
    const noSavedFavouritesMessage = <div style={{ padding: '1em' }}>
        Currently you have no saved items.</div>;
    return (
      <div className="favourites-list">
        <div className="panel-title">
          <div><FontAwesome name='star' fixedWidth={true} /> Favourites</div>
          <div>
            {this.state.premium && <button className="small-button" onClick={this.toggleBundleCreation}>{this.state.bundleCreation ? "Cancel" : "Choose items to bundle"}</button>}
            {(this.state.premium && this.state.bundleCreation) && <button className="small-button small-button--red" onClick={this.handleBundleCreation}>Create bundle</button>}
          </div>
          {(!this.state.premium && this.state.email) && <p onClick={this.handlePay} className="leavereview">Upgrade to run multiple F&R queries with 1 click</p>}
          {(!this.state.premium && !this.state.email) && <p className="logintext">Login Chrome to experience premuim features.</p>}
        </div>
        <div>
          {Object.keys(this.props.favourites).length == 0 && noSavedFavouritesMessage}
          {this.state.premium && Object.keys(this.props.favourites).filter(id=> id.substr(0,6)==="bundle").sort().map((id, idx) => {
              const textRender = this.props.favourites[id].map((item,idx)=>{
                return (
                    <span>
                      <span>{item.findTextInput}</span>
                      <FontAwesome name='long-arrow-right' /> 
                      <span>{item.replaceTextInput} </span>
                    </span>
                    )
              });
              return (
                <div className="favourites-list-item" key={id}
                    onClick={() => this.handleFavouriteSelected(id)}>
                  <span>
                    <b>Bundle : </b>{textRender}
                  </span>
                  <span>
                    {this.state.premium && <button className="small-button small-button--red" onClick={(e) => {
                        e.stopPropagation();
                        this.handleReplaceAllBundle(id);
                      }}>Run</button>}
                    <button className="small-button" onClick={(e) => {
                        e.stopPropagation();
                        this.handleunBundle(id);
                      }}>Unbundle</button>
                  </span>
                </div>
              );
            }
          )}
          {Object.keys(this.props.favourites).filter(id=> id.substr(0,6)!=="bundle")
          // .sort()
          .map((id, idx) => {
            const { findTextInput, replaceTextInput } = this.props.favourites[id];
              return (
                <div className="favourites-list-item" key={id}
                    onClick={() => this.handleFavouriteSelected(id)}>
                  <span>
                    {this.state.bundleCreation && <input type="checkbox" name={idx} checked={this.state.checkedItem[idx]} onChange={this.handleCheckbox}/>}
                    <span>{findTextInput}</span> <FontAwesome name='long-arrow-right' /> <span>{replaceTextInput}</span>
                  </span>
                  <span>
                    <button  className="small-button" onClick={(e) => {
                        e.stopPropagation();
                        this.handleReplaceAll(id);
                      }}>Run</button>
                    <FontAwesome className="favourites-list-item-remove" name='times'
                      onClick={(e) => {
                        e.stopPropagation();
                        this.handleFavouriteRemoved(id);
                      }} />
                  </span>
                </div>
              );
          }
        )}
        </div>
      </div>
    );
  }

}

export default FavouritesPanel;
