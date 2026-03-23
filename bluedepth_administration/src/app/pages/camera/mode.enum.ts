export interface CameraModeInterface {
  modality: string;
  mode: string;
  code:string;
  description:string;
}

export const CameraMode:CameraModeInterface[] =[
    {modality:"M_Manual",mode:"photo",code:"M",description:"Manuale"},
    {modality:"P_Auto",mode:"photo",code:"P",description:"Automatico"},
    {modality:"Auto",mode:"photo",code:"i",description:"Smart"},
    
    {modality:"A_AperturePriority",mode:"photo",code:"A",description:"Diaframma"},
    {modality:"S_ShutterSpeedPriority",mode:"photo",code:"S",description:"Tempi"},
    {modality:"Movie_A",mode:"video",code:"A",description:"Auto"},
    
    {modality:"Movie_P",mode:"video",code:"P",description:"Manuale"},
    {modality:"Movie_S",mode:"video",code:"S",description:"Tempi"},
    {modality:"Movie_M",mode:"video",code:"M",description:"Manuale"},
    {modality:"Movie_Auto",mode:"video",code:"i",description:"Auto"},
    {modality:"Movie_F",mode:"video",code:"F",description:"Diaframma"},

]
    
