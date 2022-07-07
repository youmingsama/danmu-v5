import request from '@/utils/request'

//搜索视频
export const searchVideoAPI = (keywords) => {
    return request.get('v1/video/search?keywords=' + keywords);
}