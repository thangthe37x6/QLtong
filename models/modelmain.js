import mongoose from "mongoose";

const conferenceSchema = new mongoose.Schema({
    username: String,
    buoiToChuc: String,
    ngayToChuc: String,
    thu: String,
    huyenToChuc: String,
    diaDiem: String,
    nhomPhuTrach: String,
    loaiHinh: String,
    SL: Number,
    anhDanhSach: String,
    anhTongThe: String,
    PC: String,
    trangThai: String,
    ghiChu: String
}, { timestamps: true });

const conferenceData = mongoose.model('Conference', conferenceSchema);

export default conferenceData;