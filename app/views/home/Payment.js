import React, { Component } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'



import { pubS,DetailNavigatorStyle,MainThemeNavColor,ScanNavStyle } from '../../styles/'
import { setScaleText, scaleSize } from '../../utils/adapter'
import { TextInputComponent,Btn,Loading, } from '../../components/'
import { connect } from 'react-redux'
import Modal from 'react-native-modal'
import Picker from 'react-native-picker'
import { insert2TradingDBAction } from '../../actions/tradingManageAction'
import UserSQLite from '../../utils/accountDB'
import { contractAbi } from '../../utils/contractAbi'
import I18n from 'react-native-i18n'
const EthUtil = require('ethereumjs-util')
const Wallet = require('ethereumjs-wallet')
const EthereumTx = require('ethereumjs-tx')
const BigNumber = require('big-number')
const sqLite = new UserSQLite()  
let db 

let self = null

import Toast from 'react-native-toast'

 function padLeftEven (hex) {
  hex = hex.length % 2 != 0 ? '0' + hex : hex;
  return hex;
}
function sanitizeHex(hex) {
    hex = hex.substring(0, 2) == '0x' ? hex.substring(2) : hex;
    if (hex == "") return "";
    return '0x' + padLeftEven(hex);
}

function decimalToHex(dec) {
    return new BigNumber(dec).toString(16);
}
function stripscript(s) {
    let pattern = new RegExp("[`~!@#$^%&*()=+|{}':;',\\-\\[\\]<>/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？]");
    let rs = "";
    for (let i = 0; i < s.length; i++) {
        rs = rs+s.substr(i, 1).replace(pattern, '');
    }
    return rs;
}
class Payment extends Component{
  constructor(props){
    super(props)
    this.state={
      receiverAddress: '',
      payTotalVal: '',
      noteVal: '',
      payAddressWarning: '',
      payTotalWarning: '',
      payPsdWarning: '',
      payPsdVal: '',
      visible: false,
      modalTitleText:I18n.t('send_detail'),
      modalTitleIcon: require('../../images/xhdpi/nav_ico_paymentdetails_close_def.png'),
      modalSetp1: true,
      senderAddress: '',
      keyStore: {},
      currentTokenName: 'ETZ',
      isToken: false,
      currentTokenDecimals: 0,
      loadingVisible: false,
      loadingText: '',
      gasValue: '',
      tokenData: '',
      contractAddress:'',
    }
    self = this
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this))
  }
  
  onNavigatorEvent(event){
     if(event.id === 'backPress'){
        if(this.props.receive_address){
          this.props.navigator.popToRoot({
            animated: true, 
            animationType: 'fade'
          })
        }
     }
  } 

  componentWillMount(){

    const { accountInfo } = this.props.accountManageReducer
    if(this.props.curToken !== 'ETZ'){
      this.setState({
        isToken: true,
        currentTokenName: this.props.curToken
      })
    }
    if(this.props.receive_address){
      this.setState({
        receiverAddress: this.props.receive_address
      })
    }

    accountInfo.map((val,index) => {
      if(val.is_selected === 1){
        let ks =  {
          "version": val.version,
          "id": val.kid,
          "address": val.address,
          "crypto": {
            ciphertext: val.ciphertext,
            cipherparams: {
              "iv": val.iv
            },
            "cipher": val.cipher,
            "kdf": val.kdf,
            "kdfparams": {
              "dklen": val.dklen,
              "salt": val.salt,
              "n":val.n,
              "r":val.r,
              "p":val.p
            },
            "mac": val.mac
          }
        }

        this.setState({
          senderAddress: `0x${val.address}`,
          keyStore: ks
        })
      }
    })
  }
  componentDidMount(){
    const tokenPickerData = ["ETZ"]
    const { selectedList } = this.props.tokenManageReducer 
    selectedList.map((val,idx) => {
      tokenPickerData.push(val.tk_symbol)
    })
    Picker.init({
      pickerConfirmBtnText: I18n.t('confirm'),
      pickerCancelBtnText: I18n.t('cancel'),
      pickerTitleText: '',
      pickerConfirmBtnColor: [21, 126, 251, 1],
      pickerCancelBtnColor: [21, 126, 251, 1],
      pickerToolBarBg: [247, 247, 247, 1],
      pickerBg: [255, 255, 255, 1],
      pickerToolBarFontSize: 14,
      pickerFontSize: 22,
      pickerFontColor: [51, 51, 51, 1],
      pickerData: tokenPickerData,
      onPickerConfirm: pickedValue => {
        this.setState({
          currentTokenName: pickedValue[0],
        })
        setTimeout(() => {
          this.getGas()
          this.getTokenDataValue()
        },500)
        if(pickedValue[0] !== 'ETZ'){
          this.setState({
            isToken: true
          })
        }
        selectedList.map((val,idx) => {
          if(val.tk_symbol === this.state.currentTokenName){
            this.setState({
              currentTokenDecimals: val.tk_decimals
            })
          }
        })


      },
    })
  }


  componentWillUnmount(){
    // this.onPressClose()
    Picker.hide()
  }
  onChangePayAddrText = (val) => {
    
    this.setState({
      receiverAddress: val.trim(),
      payAddressWarning: ''
    })  
    setTimeout(() => {
      if(this.state.receiverAddress.length === 42){
        this.getGas()
        this.getTokenDataValue()
      }
    },500)

  }

  getGas(){
    const { receiverAddress, currentTokenName, payTotalVal, tokenData, senderAddress} = this.state

    let newTotal = stripscript(payTotalVal)

    if(receiverAddress.length === 42 && newTotal.length > 0){
        let valWei = web3.utils.toWei(`${newTotal}`,'ether')
        let estObj = {
            from:senderAddress,
            to: receiverAddress,
            value: sanitizeHex(decimalToHex(valWei)),
            data: currentTokenName === 'ETZ' ? '' : sanitizeHex(tokenData)
        }
        console.log('estObj===',estObj)
        web3.eth.estimateGas(estObj).then( gas => {
          this.setState({
            gasValue: gas
          })
        })
      
    }
  }
  getTokenDataValue(){
    const { selectedList } = this.props.tokenManageReducer 
    const { currentTokenName, payTotalVal, currentTokenDecimals,receiverAddress } = this.state
    let contractAddress = ''

    if(receiverAddress.length === 42 && payTotalVal.length > 0 && currentTokenName !== 'ETZ'){
      for(let i = 0; i < selectedList.length; i++){
        if(selectedList[i].tk_symbol === currentTokenName){
          contractAddress = selectedList[i].tk_address
        }
      } 

      let txNumber = parseInt(parseFloat(payTotalVal) *  Math.pow(10,currentTokenDecimals))

      let hex16 = parseInt(txNumber).toString(16)

      let myContract = new web3.eth.Contract(contractAbi, contractAddress)

      let data = myContract.methods.transfer(receiverAddress, `0x${hex16}`).encodeABI()

      // console.log('data值',data)

      this.setState({
        tokenData: data,
        contractAddr: contractAddress,
      })
      setTimeout(() => {
        this.getGas()
      },1000)
    }
  }
  onChangePaTotalText = (val) => {
    this.setState({
      payTotalVal: val,
      payTotalWarning: ''
    })
    //payTotalVal不能有
    if(val.length > 0){
      setTimeout(() => {
        this.getGas()
        this.getTokenDataValue()
      },500)
    }
  }
  onChangeNoteText = (val) => {
    this.setState({
      noteVal: val.trim(),
    })
  }

  onNextStep = () => {
    const { receiverAddress, payTotalVal, noteVal, } = this.state
    let addressReg = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{42}$/
    if(!addressReg.test(receiverAddress)){
      this.setState({
        payAddressWarning: I18n.t('input_receive_address'),
      })
      return
    }else{
      if(payTotalVal.length === 0){
        this.setState({
          payTotalWarning: I18n.t('input_send_account')
        })
        return
      }else{
        this.setState({
          visible: true
        })
      }
    }    
  }

  toScan = () => {
    this.props.navigator.push({
      screen: 'scan_qr_code',
      title:'Scan',
      navigatorStyle: Object.assign({},DetailNavigatorStyle,{
        navBarTextColor:'#fff',
        navBarBackgroundColor:'#000',
        statusBarColor:'#000',
        statusBarTextColorScheme:'light',
      }),
    })
  }
  showTokenPicker = () => {
    Picker.show()
  }
  onPressClose = () => {
    this.setState({
      visible: false,
      modalSetp1: true,
      payPsdVal: '',
      loadingText: '',
      loadingVisible: false,
    })
  }

  onPressCloseIcon = () => {
    if(this.state.modalSetp1){
      this.onPressClose()
    }else{
      this.setState({
        modalSetp1: true,
        modalTitleText:I18n.t('send_detail'),
        modalTitleIcon: require('../../images/xhdpi/nav_ico_paymentdetails_close_def.png'),
      })
    }
  }

  onPressOrderModalBtn = () => {
    this.setState({
      modalTitleText: I18n.t('send_psd'),
      modalTitleIcon: require('../../images/xhdpi/nav_ico_createaccount_back_def.png'),
      modalSetp1: false
    })
  }
  onPressPayBtn = () => {
    
    const { payPsdVal, payPsdWarning, loadingText,loadingVisible } = this.state
    if(payPsdVal.length === 0){
      this.setState({
        payPsdWarning: I18n.t('input_password'),
        loadingText: '',
        loadingVisible: false,
      })
      return
    }else{
      this.setState({
        loadingText: I18n.t('sending'),
        loadingVisible: true,
        visible: false,
        modalSetp1: true,
      })
      setTimeout(() => {
        this.validatPsd()
      },1000)
    }
  }

  validatPsd = () => {
   
    try{

      this.makeTransact()

    } catch(err){
      console.error('psd error',err)
      this.setState({
        // visible: true,
        // modalSetp1: false,

        //出错时  
        visible: false,
        modalSetp1: true,
        payPsdVal: '',
        payPsdWarning: I18n.t('password_is_wrong'),
        loadingText: '',
        loadingVisible: false,
      })
    }
  }
  makeTransact(){
      if(!this.state.isToken){
        this.makeTransactByETZ()
      }else{
        this.makeTransactByToken()
      }
  }
  async makeTransactByETZ(){
    console.log('this.state.keyStore===',this.state.keyStore)
    const { payPsdVal,senderAddress,payTotalVal,receiverAddress,noteVal,gasValue } = this.state
    console.log('senderAddress==',senderAddress)
    try{  
      let newWallet = await Wallet.fromV3(this.state.keyStore,payPsdVal)
      let privKey = await newWallet._privKey.toString('hex')
      console.log('privKey==',privKey)
      let bufPrivKey = new Buffer(privKey, 'hex')
      // console.log('bufPrivKey==',bufPrivKey)
      let nonceNumber = await web3.eth.getTransactionCount(senderAddress)

      console.log('payTotalVal==',payTotalVal)
      let totalValue = web3.utils.toWei(payTotalVal,'ether')
      let hex16 = parseInt(totalValue).toString(16)

      
      
      const txParams = {
          nonce: `0x${nonceNumber.toString(16)}`,
          gasPrice: '0x09184e72a000', 
          gasLimit: `0x${parseInt(gasValue).toString(16)}`,
          to: receiverAddress,
          value: `0x${hex16}`,
          data: '',
          chainId: 88
      }
      console.log('txParams====',txParams)
      const tx = new EthereumTx(txParams)
      tx.sign(bufPrivKey)
      const serializedTx = tx.serialize()
      console.log('serializedTx==',serializedTx)

      
      let hashVal = ''
      web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`)
      .on('transactionHash', function(hash){
         console.log('hash==',hash)
        hashVal = hash
        self.onPressClose()
        setTimeout(() => {
          self.props.navigator.popToRoot({
            animated: true,
            animationType: 'fade',
          })
        },1000)

      })
      .on('receipt', function(receipt){
          console.log('receipt==',receipt)
          let sendResult = 1
          if(receipt.status==="0x1"){
             Toast.showLongBottom(I18n.t('send_successful'))
          }else{
            sendResult = 0
            Toast.showLongBottom(I18n.t('send_failure'))
          }

          self.props.dispatch(insert2TradingDBAction({
            tx_hash: hashVal,
            tx_value: payTotalVal,
            tx_sender: senderAddress,
            tx_receiver: receiverAddress,
            tx_note: noteVal,
            tx_token: "ETZ",
            tx_result: sendResult,
          }))
      })
      // .on('confirmation', function(confirmationNumber, receipt){ 
        
      // })
      .on('error', (error) => {
        console.log('error==',error)
        Toast.showLongBottom(`${error}`)
        self.onPressClose()
        self.props.navigator.pop()
        // alert(error)
      })
    }catch(error){
      this.onPressClose()
      Toast.showLongBottom(I18n.t('password_is_wrong'))
    }
  }
  async makeTransactByToken(){
    
    const { payPsdVal,senderAddress,payTotalVal,receiverAddress,noteVal,currentTokenName,currentTokenDecimals, gasValue,tokenData, contractAddr } = this.state
    const { selectedList } = this.props.tokenManageReducer 

    try{
      let newWallet = await Wallet.fromV3(this.state.keyStore,payPsdVal)
      let privKey = await newWallet._privKey.toString('hex')
     

      web3.eth.getTransactionCount(senderAddress, function(error, nonce) {

        const txParams = {
            nonce: web3.utils.toHex(nonce),
            gasPrice:"0x098bca5a00",
            // gasLimit: `0x${parseInt(gasValue).toString(16)}`,
            gasLimit: `0x7a120`,
            to: contractAddr,
            value :"0x0",
            data: tokenData,
            chainId: "0x58"
        }

        console.log('txParams====',txParams)

        const tx = new EthereumTx(txParams)
        // 通过明文私钥初始化钱包对象key
        const privateKey = Buffer.from(privKey, 'hex')

        let key = Wallet.fromPrivateKey(privateKey)

        
        tx.sign(key.getPrivateKey())

        var serializedTx = '0x' + tx.serialize().toString('hex')

        console.log("serializedTx: ", serializedTx)
        
        console.log("txParams:", txParams)
        let hashVal = ''
        web3.eth.sendSignedTransaction(serializedTx).on('transactionHash', function(hash){
            console.log('transactionHash:', hash)
            hashVal = hash
            self.onPressClose()
            setTimeout(() => {
              self.props.navigator.popToRoot({
                animated: true,
                animationType: 'fade',
              })
            },1000)

        })
        // .on('confirmation', function(confirmationNumber, receipt){
            // console.log('confirmation:', confirmationNumber)
            
        // })
        .on('receipt', function(receipt){
            console.log('receipt:', receipt)
            let sendResult = 1
            if(receipt.status==="0x1"){//"0x1" succ "0x0" fail
               Toast.showLongBottom(I18n.t('send_successful'))
            }else{
              sendResult = 0
              Toast.showLongBottom(I18n.t('send_failure'))
            }

            self.props.dispatch(insert2TradingDBAction({
              tx_hash: hashVal,
              tx_value: payTotalVal,
              tx_sender: senderAddress,
              tx_receiver: receiverAddress,
              tx_note: noteVal,
              tx_token: currentTokenName,
              tx_result: sendResult,
            }))
            self.props.dispatch(insert2TradingDBAction({
              tx_hash: hashVal,
              tx_value: '0.00',
              tx_sender: senderAddress,
              tx_receiver: receiverAddress,
              tx_note: noteVal,
              tx_token: "ETZ",
              tx_result: sendResult,
            }))

        }).on('error', (error) => {
          console.error(error)
          self.onPressClose()
          self.props.navigator.pop()
          Toast.showLongBottom(error)
          // alert(error)
        });
      })

    }catch (error) {
      this.onPressClose()
      Toast.showLongBottom(I18n.t('password_is_wrong'))
    }

  }
  onChangePayPsdText = (val) => {
    this.setState({
      payPsdVal: val,
      payPsdWarning: ''
    })
  }
  render(){
    const { receiverAddress, payTotalVal, noteVal,visible,modalTitleText,modalTitleIcon,payPsdVal,
            modalSetp1,payAddressWarning,payTotalWarning,senderAddress,payPsdWarning,currentTokenName, gasValue } = this.state
    return(
      <View style={pubS.container}>
        <Loading loadingVisible={this.state.loadingVisible} loadingText={this.state.loadingText}/>
        <TextInputComponent
          value ={currentTokenName}
          editable={false}
          toMore={true}
          touchable={true}
          onPressTouch={this.showTokenPicker}
        />
        <TextInputComponent
          placeholder={I18n.t('receiver_address')}
          value={receiverAddress}
          onChangeText={this.onChangePayAddrText}
          warningText={payAddressWarning}
          isScan={true}
          onPressIptRight={this.toScan}
        />
        <TextInputComponent
          placeholder={I18n.t('amount')}
          value={payTotalVal}
          onChangeText={this.onChangePaTotalText}
          warningText={payTotalWarning}
          keyboardType={'numeric'}
        />
        <TextInputComponent
          placeholder={I18n.t('note_1')}
          value={noteVal}
          onChangeText={this.onChangeNoteText}
        />
        {
          currentTokenName === 'ETZ' ?
          <View style={[styles.gasViewStyle,pubS.rowCenterJus]}>
            <Text style={{color:'#C7CACF',fontSize: setScaleText(26)}}>Gas:</Text>
            <Text>{gasValue}</Text>
          </View>
          : null
        }
        <Btn
          btnMarginTop={scaleSize(60)}
          btnPress={this.onNextStep}
          btnText={I18n.t('next')}
        />

        <Modal
          isVisible={visible}
          onBackButtonPress={this.onPressClose}
          onBackdropPress={this.onPressClose}
          style={styles.modalView}
          backdropOpacity={.8}
        >
          <View style={styles.modalView}>
            <View style={[styles.modalTitle,pubS.center]}>
              <TouchableOpacity onPress={this.onPressCloseIcon} activeOpacity={.7} style={{position:'absolute',left: scaleSize(24),top: scaleSize(29)}}>
                <Image source={modalTitleIcon} style={{height: scaleSize(30),width: scaleSize(30)}}/>
              </TouchableOpacity>
              <Text style={pubS.font26_4}>{modalTitleText}</Text>
            </View>
            {
              modalSetp1 ?
              <View>
                <RowText
                  rowTitle={I18n.t('order_note')}
                  rowContent={noteVal}
                />
                <RowText
                  rowTitle={I18n.t('to_address')}
                  rowContent={receiverAddress}
                />
                <RowText
                  rowTitle={I18n.t('from_address')}
                  rowContent={senderAddress}
                />
                <RowText
                  rowTitle={I18n.t('amount_1')}
                  rowContent={payTotalVal}
                  rowUnit={currentTokenName}
                />

                <Btn
                  btnPress={this.onPressOrderModalBtn}
                  btnText={I18n.t('confirm')}
                  btnMarginTop={scaleSize(50)}
                />
              </View>
              :
              <View>
                <TextInputComponent
                  placeholder={I18n.t('password')}
                  value={payPsdVal}
                  onChangeText={this.onChangePayPsdText}
                  warningText={payPsdWarning}
                  secureTextEntry={true}
                />
                <Btn
                  btnPress={this.onPressPayBtn}
                  btnText={I18n.t('make_send')}
                  btnMarginTop={scaleSize(50)}
                />
              </View>
            }
          </View>
        </Modal>
      </View>
    )
  }
}
class RowText extends Component{
  static defaultProps = {
    rowUnit: '',
  }
  render(){
    const { rowTitle,rowContent, rowUnit} = this.props
    return(
      <View style={[styles.rowTextView,pubS.rowCenterJus]}>
        <Text style={[pubS.font26_5,{width:'20%'}]}>{rowTitle}</Text>
        <View style={[pubS.rowCenterJus,{width: '80%',}]}>
          <Text style={[pubS.font26_4,{marginLeft: scaleSize(40)}]}>{rowContent}</Text>
          {
            rowUnit.length > 0 ?
            <Text style={pubS.font26_4}>{rowUnit}</Text>
            : null
          }
        </View>
      </View>
    )
  }
}
const styles = StyleSheet.create({
    gasViewStyle:{
      paddingLeft: 4,
      alignSelf:'center',
      width: scaleSize(680),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor:'#DBDFE6',
      height: scaleSize(99)
    },
    rowTextView:{
        width: scaleSize(680),
        height: scaleSize(88),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#DBDFE6',
        alignSelf:'center'
    },
    modalTitle:{
      height: scaleSize(88),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor:'#F2F2F2',
      borderWidth:1,
    },
    modalView:{
      width: scaleSize(750),
      marginBottom:0,
      height: scaleSize(710),
	    position: 'absolute',
	    bottom: 0,
	    alignSelf: 'center',
	    backgroundColor:'#fff',
    },
})

export default connect(
  state => ({
    accountManageReducer: state.accountManageReducer,
    tokenManageReducer: state.tokenManageReducer
  })
)(Payment)
