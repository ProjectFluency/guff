const React = require('react');
const ReactNative = require('react-native');
const moment = require('moment');
import { GiftedChat } from 'react-native-gifted-chat';
import Emoji from 'react-native-emoji';
import { STATUS_BAR_HEIGHT } from '../../config/constants'

const {
  View,
  Text,
  StyleSheet,
  TextInput,
  AsyncStorage,
  ActivityIndicator
} = ReactNative;
const {
  idFromName,
  serverToClientFormat,
  clientToServerFormat,
  DATE_FMT,
} = require('./messages.js');
const {
  ConversationRecorder,
  ConversationDisplay
} = require('./convo-recorder.js');
const Button = require('./button.js');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      username: null,
      message: '',
      chat: [],
      showConvoRecorder: false,
    };
  },
  componentWillMount: function(){
    try {
      AsyncStorage.getItem('@guff:username', (err, username) => {
        if(err || !username) {
          this.props.navigator.immediatelyResetRouteStack([
              {name: 'signin'}
          ]);
        } else {
          this.setState({
            username: username
          });

          this.firebaseListen();
        }
      });
    } catch(e) {
      console.log(e);
    }
  },
  renderCustom: function(props) {
    var msg = props.currentMessage;
    if (msg.type === "emoji") {
      return(<Emoji name={msg.emoji} />);
    } else if (msg.type === "transcript") {
      //console.log(msg.transcript);
      return(<View />);
    }
  },
  renderReactions: function() {
    var emojis = ["smile", "sweat_smile", "confused", "grin", "+1"];
    var that = this;
    var emoji_views = emojis.map(function(es) {
      var etxt = ":" + es + ":";
      return (
          <Button emoji={es} key={es}
                  onPress={() => that.processMessage({emoji: etxt, type: "emoji"})} />
      );
    });
    return (
        <View style={styles.emojiBar}>
          {emoji_views}
          <Button emoji="speech_balloon"
                  onPress={() => that.setState({showConvoRecorder: true})}/>
        </View>);
  },
  render: function() {
    var that = this;
    var close = function() {that.setState({showConvoRecorder: false})};
    var submit = function(transcript) {
      that.processMessage({type: "transcript", transcript: transcript});
      close();
    };
    if (!this.state.username || this.state.chat.length === 0) {
      return(
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator />
          <Text>Loading...</Text>
        </View>
      );
    } else if (this.state.showConvoRecorder) {
      return(
        <View style={styles.container}>
          <ConversationRecorder close={close} submitTranscript={submit} />
        </View>
      );
    } else {
      return(
        <View style={styles.container}>
          {this.chatHistory()}
        </View>
      );
    }
  },
  firebaseListen: function() {
    this.props.firebase.database().ref("/messages/public_chat").on('value', (snapshot) => {

      if (snapshot.val()) {
        console.log(snapshot.val());
        const record = snapshot.val();
        const chat = [];

        for (var key in record) {
          if (record.hasOwnProperty(key)) {
            var message = record[key];
            chat = [message].concat(chat);
          }
        }
        this.setState({
          chat: chat,
        });
      }
    });
  },
  chatHistory: function() {
    var messages = this.state.chat.map(serverToClientFormat);
    return(
        <GiftedChat
          messages={messages}
          user={{
            _id: idFromName(this.state.username),
            name: this.state.username}}
          renderFooter={this.renderReactions}
          renderCustomView={this.renderCustom}
          onSend={this.onPressSend} />);
  },
  processMessage: function(messageObj){
    const path = "/messages/public_chat";
    var serverMsg = clientToServerFormat(messageObj, this.state.username);
    console.log({clientMsg: messageObj, serverMsg: serverMsg});
    this.props.firebase.database().ref(path).push(serverMsg)
      .then((response) => {})
      .catch((err) => {
        console.log(err);
      });
  },
  onPressSend: function(messages = []) {
    messages.map(this.processMessage);
  },
  onPressLogOut: function() {
    AsyncStorage.removeItem('@guff:username');

    this.props.firebase.auth().signOut();

    this.props.navigator.immediatelyResetRouteStack([
        {name: 'signin'}
    ]);
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    padding: 4,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    margin: 5,
    width: 200,
    alignSelf: 'center'
  },
  label:{
    fontSize: 18
  },
  emojiBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
