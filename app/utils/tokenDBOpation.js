import { contractAbi } from './contractAbi'
import accountDB from '../db/account_db'

async function onFetchToken(options){
	const { parames, fetchTokenSuccess, fetchTokenFail } = options
	let insertRes = []
	let res = await fetch('http://52.74.3.64/token-list.txt',{
		method: 'GET',
	    headers: {
	        'Accept': 'application/json',
	        'Content-Type': 'application/json',
	    }
	})
	let response = null
	response = await res.json()
	console.log('response===',response)
	//fetch到token列表后  全部插入数据库
	for(let i = 0; i < response.length; i++){
		let myContract = new web3.eth.Contract(contractAbi, response[i].address)
		let result = await myContract.methods.balanceOf(parames.addr).call()
		let number = result / Math.pow(10,response[i].decimals)
		console.log('number==',number)
  		let token = {}
  		token.account_addr = parames.addr //当前账户的地址
  		token.tk_address = response[i].address
  		token.tk_decimals = response[i].decimals
  		token.tk_name = response[i].name
  		token.tk_price = response[i].price
  		token.tk_symbol = response[i].symbol
  		token.tk_selected = 0
  		token.tk_number = number
  		insertRes.push(token)
	}

	
	let insertTokenRes = await accountDB.insertToTokenTable(insertRes)
	if(insertTokenRes){




		// for(let i = 0; i < response.length; i++){
		// 	let tokenAddr = response[i].address
			
		// 	let myContract = new web3.eth.Contract(contractAbi, tokenAddr)
		// 	myContract.methods.balanceOf(parames.addr).call((error,result) => {
		// 		let number = result / Math.pow(10,response[i].decimals)

		// 		await accountDB.updateTable({
		// 			sql: 'update token set tk_number = ? where tk_address = ?',
		// 			parame: [number,tokenAddr]
		// 		})
		// 	})
		// }

		//返回最新的token列表 (带有余额)



		let selTokenRes = await accountDB.selectTable({
			sql: 'select * from token where account_addr = ?',
			parame: [parames.addr]
		})
		console.log('返回最新的token列表 (带有余额)==',selTokenRes)
		fetchTokenSuccess(selTokenRes)
	}else{
		fetchTokenFail()
	}


	
}

async function onDelSelectedToken(options){
	const { parames, deleteSelected } = options
	let selRes = await accountDB.updateTable({
		sql: 'update token set tk_selected = 0 where tk_address = ? and account_addr = ?',
		parame: [parames.delAddr,parames.curaddr]
	})

	if(selRes === 'success'){
		deleteSelected(true)
	}else{
		if(selRes === 'fail'){
			deleteSelected(false)
		}
	}

}

async function onAddSelectedToken(options){
	const { parames, addSelected } = options
	let selRes = await accountDB.updateTable({
		sql: 'update token set tk_selected = 1 where tk_address = ? and account_addr = ? ',
		parame: [parames.addAddr,parames.curaddr]
	})

	if(selRes === 'success'){
		addSelected(true)
	}else{
		if(selRes === 'fail'){
			addSelected(false)
		}
	}
}

async function onInitSelectedToken(options){
	const { parames, initSelectedTokenList, } = options

	let selTokenRes = await accountDB.selectTable({
		sql: 'select * from token',
		parame: []
	})
	initSelectedTokenList(selTokenRes)
}

async function onSwitchTokenList(options){
	const { parames, switchTokenSuc } = options 
	let selTokenRes = await accountDB.selectTable({
		sql: 'select * from token where account_addr = ?',
		parame: [parames.addr]
	})

	switchTokenSuc(selTokenRes)

}


async function onTokenRefresh(options){
	const { parames, refreshSuccess,refreshFail,refreshEtz } = options
	const { tokenlist,addr } = parames
	for(let i = 0; i < tokenlist.length; i++){
		let tAdd = tokenlist[i].tk_address//tAdd 代币的合约地址
		
		let myContract = new web3.eth.Contract(contractAbi, tAdd)

		let result = await myContract.methods.balanceOf(addr).call()
		
		let number = result / Math.pow(10,tokenlist[i].tk_decimals)

		await accountDB.updateTable({
			sql: 'update token set tk_number = ? where tk_address = ?',
			parame: [number,tAdd]
		})

	}

	let selTokenRes = await accountDB.selectTable({
		sql: 'select * from token',
		parame: []
	})
	if(selTokenRes.length !== 0){

		let balance = await web3.eth.getBalance(`0x${addr}`)
    	let res = web3.utils.fromWei(balance,'ether')

		refreshEtz(res)

		refreshSuccess(selTokenRes)
	}else{
		refreshFail()
	}
}

const tokenDBOpation = {
	tokenRefresh: (options) => {
		onTokenRefresh(options)
	},
	fetchToken: (options) => {
		onFetchToken(options)
	},
	deleteSelectedToken: (options) => {
		onDelSelectedToken(options)
	},
	addSelectedToken: (options) => {
		onAddSelectedToken(options)
	},
	initSelectedToken: (options) => {
		onInitSelectedToken(options)
	},
	switchTokenList: (options) => {
		onSwitchTokenList(options)
	},
}
export default tokenDBOpation