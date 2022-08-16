import React, { SyntheticEvent, useRef, useState } from 'react'
import { Button, Keyboard, Platform, SafeAreaView, TextInput } from 'react-native'
import { WebView } from 'react-native-webview'

const App = () => {
  const [uri, setUri] = useState("")
  const [query, setQuery] = useState("")
  const ipfsViewRef = useRef<WebView>(null)
  
  const onLoadEnd = (syntheticEvent:any)=> {
    const url = syntheticEvent.nativeEvent.url

    ipfsViewRef?.current?.postMessage(url)
    setUri(url)
  }
  
  const search = () => {
    if(!query || query.length == 0) return

    setUri(`https://www.google.com/search?q=${query}`)

    Keyboard.dismiss()
  }

  const isAndroid= Platform.OS==='android'
  return (
    <SafeAreaView style={{flex: 1}} >
      <WebView
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        source={{uri:isAndroid?'file:///android_asset/ipfsview/index.html':'./ipfsview/index.html'}}
        ref={ipfsViewRef}
      />
      <TextInput onChangeText={query => setQuery(query)} placeholder='input search word'/>
      <Button onPress={search} title='search'/>
      <WebView 
        source={{ uri : uri }}
        onLoadEnd={onLoadEnd}
      />  
    </SafeAreaView>
  )
}

export default App
