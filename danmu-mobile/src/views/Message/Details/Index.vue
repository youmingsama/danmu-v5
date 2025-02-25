<template>
    <div class="msg" v-title data-title="私信">
        <div class="msg-header">
            <n-icon :size="22" @click="backMessage()">
                <chevron-back-outline></chevron-back-outline>
            </n-icon>
            <p calss="name">{{ targetUser.name }}</p>
            <span></span>
        </div>
        <div ref="msgBox" class="msg-main" @scroll="lazyLoading">
            <div class="content-box" v-for="(item, index) in msgDetails" :key="index">
                <!--自己发送的-->
                <div v-if="item.from_id == userInfo.uid">
                    <common-avatar class="avatar-right" :url="userInfo.avatar" :size="45"></common-avatar>
                    <span class="content-right">{{ item.content }}</span>
                </div>
                <!--收到的-->
                <div v-else>
                    <common-avatar class="avatar-left" :url="targetUser.avatar" :size="45"></common-avatar>
                    <div class="content-left-box">
                        <span class="content-left">{{ item.content }}</span>
                    </div>
                </div>
                <!-- 解决div无法撑开的问题 -->
                <div style="clear:both;" />
            </div>
        </div>

        <div class="msg-input">
            <n-input v-model:value="msgForm.content" placeholder="发个消息呗~" maxlength="255" show-count
                @keydown.enter="sendMsg"></n-input>
            <n-button type="primary" :loading="sendLoading" @click="sendMsg">发送</n-button>
        </div>
    </div>
</template>

<script lang="ts">
import { Base64 } from 'js-base64';
import { useRoute, useRouter } from 'vue-router';
import storage from '@/utils/stored-data';
import { MsgSocketURL } from '@/utils/request';
import { getMsgDetailsAPI, sendMsgAPI } from '@/api/message';
import CommonAvatar from '@/components/CommonAvatar.vue';
import { NInput, NIcon, NButton, useMessage } from 'naive-ui';
import { messageDetailsType } from '@/types/message'
import { ChevronBackOutline } from '@vicons/ionicons5'
import { onBeforeMount, onBeforeUnmount, reactive, ref, computed, nextTick, defineComponent } from 'vue';

export default defineComponent({
    setup() {
        const msgDetails = ref<Array<messageDetailsType>>([]);
        const msgForm = reactive({
            fid: 0,
            content: ''
        })

        const message = useMessage();//通知
        //用户信息
        const userInfo = computed(() => {
            return storage.get("userInfo");
        })


        //取消息详情
        const page = ref(1);
        const loading = ref(false);
        const noMore = ref(false);//没有更多
        const allowToBottom = ref(true);//是否允许自动跳转到底部
        const targetUser = reactive({
            name: "",
            avatar: ""
        })

        //获取更多消息
        const getMsgContent = (fid: number) => {
            loading.value = true;
            getMsgDetailsAPI(fid, page.value, 10).then((res) => {
                if (res.data.code === 2000) {
                    const resMsg = res.data.data.messages;
                    if (resMsg.length < 10) {
                        noMore.value = true;
                    }
                    msgDetails.value = resMsg.concat(msgDetails.value);
                    nextTick(() => {
                        toBottom()
                    })
                }
                loading.value = false;
            });
        }

        //加载更多
        const msgBox = ref<HTMLElement | null>(null);
        const lazyLoading = () => {
            const scrollTop = msgBox.value?.scrollTop || Infinity;
            if (scrollTop < 30 && !loading.value && !noMore.value) {
                page.value++;
                allowToBottom.value = false;
                getMsgContent(msgForm.fid);
            }
        }

        //到达底部
        const toBottom = () => {
            if (allowToBottom.value) {
                msgBox.value!.scrollTop = msgBox.value!.scrollHeight;
            } else {
                msgBox.value!.scrollTop = 160;
                allowToBottom.value = true;
            }
        }

        const router = useRouter();
        const backMessage = () => {
            // router.push({ name: 'Home'});
            router.push({ name: "Announce" });
        }

        //发送消息
        const sendLoading = ref(false);
        const sendMsg = () => {
            if (!msgForm.content) {
                message.error('不能发送空消息');
                return;
            }
            sendLoading.value = true;
            sendMsgAPI(msgForm).then((res) => {
                if (res.data.code === 2000) {
                    msgDetails.value.push({
                        fid: 0,
                        from_id: userInfo.value.uid,
                        content: msgForm.content,
                        created_at: ""
                    });
                    msgForm.content = "";
                    sendLoading.value = false;
                    nextTick(() => {
                        toBottom()
                    })
                }
            }).catch(() => {
                sendLoading.value = false;
                message.error('发送失败');
            });
        }

        //websocket
        const SocketURL = ref("");
        const websocket = ref<WebSocket | null>(null);
        //初始化weosocket
        const initWebSocket = () => {
            const wsProtocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
            if (MsgSocketURL === "/api/v1/message/ws") {
                SocketURL.value = wsProtocol + window.location.host + "/api/v1/message/ws";
            } else {
                //处理协议部分
                let reg = new RegExp('^http(s)?:')
                SocketURL.value = MsgSocketURL.replace(reg, wsProtocol);
            }
            SocketURL.value += "?token=" + storage.get("token");
            websocket.value = new WebSocket(SocketURL.value);
            websocket.value.onmessage = websocketOnmessage;
        }

        //数据接收
        const websocketOnmessage = (e: any) => {
            const res = JSON.parse(Base64.decode(e.data));
            if (msgForm.fid === res.fid) {
                msgDetails.value.push({
                    fid: msgForm.fid,
                    from_id: res.fid,
                    content: res.content,
                    created_at: ""
                });
                nextTick(() => {
                    toBottom()
                })
            }
        }

        //加载和卸载页面
        const route = useRoute();
        onBeforeMount(() => {
            if (route.query.fid) {
                msgForm.fid = Number(route.query.fid);
                targetUser.name = (route.query.name || "").toString();
                targetUser.avatar = (route.query.avatar || "").toString();
            }
            getMsgContent(msgForm.fid);
            initWebSocket();
        })

        onBeforeUnmount(() => {
            if (websocket.value) {
                websocket.value.close();
            }
        })

        return {
            msgBox,
            userInfo,
            msgDetails,
            targetUser,
            msgForm,
            sendLoading,
            backMessage,
            sendMsg,
            lazyLoading,
            getMsgContent
        }
    },
    components: {
        NIcon,
        NInput,
        NButton,
        CommonAvatar,
        ChevronBackOutline
    }
});
</script>

<style lang="less" scoped>
.msg {

    .msg-header {
        position: fixed;
        height: 50px;
        width: 100%;
        z-index: 999;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;

        span {
            width: 50px;
            text-align: center;
        }
    }

    .msg-main {
        padding-top: 50px;
        height: calc(100vh - 100px);
        background-color: #f7f7f7;
        border-bottom: 1px solid #e1e2e3;
        overflow-y: auto;

        /**修改滚动条样式 */
        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-thumb {
            /*滚动条里面小方块*/
            border-radius: 2px;
            background: #999999;
        }

        &::-webkit-scrollbar-track {
            /*滚动条里面轨道*/
            border-radius: 5px;
        }
    }

    /**聊天部分 */
    .content-box {
        min-height: 70px;
        margin: 6px 20px;

        &:nth-child(1) {
            margin-top: 10px;
        }

        .avatar-right {
            float: right;
        }

        .content-right {
            float: right;
            max-width: 80%;
            margin-right: 10px;
            margin-top: 6px;
            background-color: #40a9ff;
            color: #fff;
            font-size: 16px;
            border-radius: 3px;
            padding: 5px 10px 5px 10px;
        }

        .avatar-left {
            float: left;
        }

        .content-left-box {
            float: left;
            margin-left: 10px;
            margin-top: 10px;
            max-width: 80%;
            background: #fff;
            padding: 5px 10px 5px 10px;
            border-radius: 3px;
        }

        .content-left {
            font-size: 1rem;
        }
    }

    .msg-input {
        height: 50px;
        display: flex;
        padding: 0 6px;
        align-items: center;
        justify-content: space-between;

        button {
            width: 80px;
        }
    }
}
</style>