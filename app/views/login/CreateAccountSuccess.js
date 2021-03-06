import React, { Component } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'

import { pubS,DetailNavigatorStyle } from '../../styles/'
import { setScaleText, scaleSize } from '../../utils/adapter'
import { Btn } from '../../components/'
import { toSplash } from '../../root'
import I18n from 'react-native-i18n'
class CreateAccountSuccess extends Component{
  constructor(props){
    super(props)
    this.state = {
      userName: '',
      address: '',
    }
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this))
  }
  
  onNavigatorEvent(event){
    if (event.type == 'NavBarButtonPress') {
      if(event.id === 'backPress'){
          toSplash()
      }
    }
  }


  onPressBackUp = () => {
    toSplash()
    // this.props.navigator.push({
    //   screen: 'back_up_account',
    //   title: 'username',
    //   navigatorStyle: DetailNavigatorStyle,
    //   // passProps: {
    //   //   userName: userName,
    //   //   address: `0x${addressText}`
    //   // },
    //   navigatorButtons: {
    //     rightButtons: [
    //       {
    //         title: 'Save',
    //         id: 'save_back_up_info'
    //       }
    //     ]
    //   }
    // })
  }
  render(){
    return(
      <View style={pubS.container}>
        <View style={{alignItems:'center'}}>
          <Image source={require('../../images/xhdpi/ico_createaccount_succeed.png')} style={styles.imgStyle}/>
          <Text style={[pubS.font36_1,{marginTop: scaleSize(70),textAlign:'center',}]}>{I18n.t('create_account_successful_1')}</Text>
          <Text style={[pubS.font26_2,{width:'90%',marginTop: scaleSize(27),textAlign:'center',lineHeight:25,}]}>{I18n.t('create_account_successful_2')}</Text>
          <Btn
            btnMarginTop={scaleSize(97)}
            btnPress={this.onPressBackUp}
            btnText={I18n.t('backup_now')}
          />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  imgStyle:{
    width: scaleSize(150),
    height: scaleSize(150),
    alignSelf:'center',
    marginTop: scaleSize(100),

  },
})
export default CreateAccountSuccess
