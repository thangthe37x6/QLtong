import mongoose from "mongoose";


const detailconference = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username:String,
    tenHoiNghi: String,
    ngayToChuc: String,
    huyenToChuc: String,
    diaDiem: String,
    nhomPhuTrach: String,
    loaiHinh: String,
    SL: Number,
    anhDanhSach: String,
    anhTongThe: String,
    PC: String
});

const personaldata = mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    detailHN: {
        type: detailconference,
        required: true
    }
},{ strict: false , timestamps: true,})

export default mongoose.model("personalData", personaldata)