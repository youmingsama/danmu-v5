import { ref } from 'vue';
import { useNotification } from 'naive-ui';
import { getVideoListByUidAPI } from "@/api/video.js";

export default function useUserVideo() {
    const count = ref(0);
    const videoList = ref([]);
    const notification = useNotification();//通知
    
    const getVideoListByUid = (uid, page, pageSize) => {
        getVideoListByUidAPI(uid, page, pageSize).then((res) => {
            if (res.data.code === 2000) {
                count.value = res.data.data.count;
                videoList.value = res.data.data.videos;
            }
        }).catch((err) => {
            notification.error({
                title: '获取失败',
                content: "原因:" + err.response.data.msg,
                duration: 5000,
            })
        });
    }

    return {
        count,
        videoList,
        getVideoListByUid
    }
}

