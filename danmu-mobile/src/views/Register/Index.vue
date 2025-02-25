<template>
    <div class="bg">
        <div class="head-box">
            <div class="head-text">
                <span>您好，</span>
                <br>
                <span>欢迎注册 {{ config.title }}</span>
            </div>
        </div>
        <div class="login-div">
            <div class="login-box">
                <n-form ref="formRef" :rules="rules" :model="registerForm" label-placement="left" label-width="auto">
                    <n-form-item label="邮箱" path="email">
                        <n-input placeholder="请输入邮箱" v-model:value="registerForm.email" />
                    </n-form-item>
                    <n-form-item label="密码" path="password">
                        <n-input placeholder="请输入密码" v-model:value="registerForm.password" type="password" />
                    </n-form-item>
                    <n-form-item label="验证码" path="code">
                        <n-input placeholder="请输入验证码" v-model:value="registerForm.code" />
                        <n-button :disabled="disabledSend" @click="sendCode">{{ sendBtnText }}</n-button>
                    </n-form-item>
                    <div class="card-btn">
                        <n-button type="primary" @click="registerClick()">注册</n-button>
                        <n-button @click="goLogin">返回登录</n-button>
                    </div>
                </n-form>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import config from "@/config";
import { useRouter } from "vue-router";
import { reactive, ref, defineComponent } from 'vue';
import { registerFormType } from '@/types/user';
import { registerAPI } from '@/api/user';
import { sendRegisterCodeAPI } from '@/api/code';
import { NForm, FormInst, FormRules, NFormItem, NButton, NInput, useMessage } from 'naive-ui';

export default defineComponent({
    setup() {

        const formRef = ref<FormInst | null>(null);
        const message = useMessage();//通知
        const router = useRouter();

        const registerForm = reactive<registerFormType>({
            email: "",
            password: "",
            code: ""
        })

        const rules: FormRules = {
            email: [
                { required: true, message: "请输入邮箱", trigger: ['blur', 'input'] },
                { type: "email", message: "请输入正确的邮箱地址", trigger: ['blur', 'input'] },
            ],
            password: { required: true, message: '请输入密码', trigger: ['blur', 'input'] },
            code: { required: true, message: '请输入验证码', trigger: ['blur', 'input'] },
        }

        const registerClick = () => {
            formRef.value?.validate((errors) => {
                if (!errors) {
                    registerAPI(registerForm).then((res) => {
                        if (res.data.code === 2000) {
                            message.success('注册成功');
                            goLogin();
                        }
                    }).catch(() => {
                        message.error('注册失败');
                    })
                } else {
                    message.error('请检查输入的数据');
                }
            })
        }

        //返回登录
        const goLogin = () => {
            router.push({ name: 'Login' });
        }

        //发送验证码
        const disabledSend = ref(false);//禁用发送按钮
        const sendBtnText = ref("发送验证码");//发送按钮文字

        const sendCode = () => {
            if (!registerForm.email) {
                return;
            }
            //禁用发送按钮
            disabledSend.value = true;
            sendRegisterCodeAPI(registerForm.email).then((res) => {
                if (res.data.code === 2000) {
                    if (res.data.data.code) {
                        message.success(`验证码为：${res.data.data.code}`);
                    } else {
                        message.success('发送成功')
                    }

                    //开启倒计时
                    let count = 0;
                    let tag = setInterval(() => {
                        if (++count >= 60) {
                            clearInterval(tag);
                            disabledSend.value = false;
                            sendBtnText.value = "发送验证码";
                            return;
                        }
                        sendBtnText.value = `${60 - count}秒后获取`;
                    }, 1000);
                }
            }).catch(() => {
                disabledSend.value = false;
                sendBtnText.value = "发送验证码";
                message.error('发送失败');
            });
        }

        return {
            rules,
            config,
            formRef,
            sendBtnText,
            disabledSend,
            registerForm,
            goLogin,
            sendCode,
            registerClick
        }
    },
    components: {
        NForm,
        NFormItem,
        NButton,
        NInput
    }
});
</script>

<style lang="less" scoped>
.bg {
    position: fixed;
    top: 0;
    bottom: 0;
    width: 100%;
    background-color: #36ad6a;
}

.head-box {
    width: 100%;
    height: 30rem;

    .head-text {
        text-align: left;
        font-size: 1.2rem;
        color: #fff;
        padding: 3rem 0 0 1rem;
        font-weight: bold;
        line-height: 2.2rem;
    }
}

.login-div {
    width: 100%;
    height: 100%;
    position: relative;
    margin-top: -20rem;
    border-radius: 2rem 2rem 0 0;
    background-color: #fff;

    .login-box {
        padding: 2rem 1rem;

        .card-btn {
            text-align: center;

            button {
                width: 100%;
                margin-top: 1rem;
            }
        }
    }
}
</style>
 