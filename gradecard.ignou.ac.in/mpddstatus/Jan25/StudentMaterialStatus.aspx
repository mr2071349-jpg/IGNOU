

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="../../../www.w3.org/1999/xhtml">
<title>IGNOU: Student Material Status </title> 

<!-- Mirrored from gradecard.ignou.ac.in/mpddstatus/Jan25/StudentMaterialStatus.aspx by HTTrack Website Copier/3.x [XR&CO'2014], Thu, 08 Oct 2026 09:19:46 GMT -->
<!-- Added by HTTrack --><meta http-equiv="content-type" content="text/html;charset=utf-8" /><!-- /Added by HTTrack -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

        <link rel="stylesheet" href="js/bootstrap.min.css">
      
        <link href="include/ignou.css" type="text/css" rel="stylesheet" />

        <script language="javascript" type="text/javascript">
            function forClose() {
                var win = window.open("about:blank", "_self");
                //var win=window.open('','_parent','');
                win.close();
            }
</script>
    <style>
    .tdheader
{
    TEXT-ALIGN: left;
    FONT-FAMILY: Verdana, Tahoma, Arial;
    HEIGHT: 25px;
    FONT-SIZE: 11pt;
    FONT-WEIGHT: bold
}
.c2font
{
    FONT-FAMILY: Verdana, Tahoma, Arial;
    COLOR: red;
    FONT-SIZE: 10pt;
    FONT-WEIGHT: bold
}
.td1
{
    TEXT-ALIGN: left;
    FONT-FAMILY: Verdana, Tahoma, Arial;
    COLOR: black;
    FONT-SIZE: 10pt;
    margin-top:5px;
    height:36px;
}
.td2
{
    TEXT-ALIGN: left;
    FONT-FAMILY: Verdana, Tahoma, Arial;
    height:36px;
    margin-top:5px;
    COLOR: black;
    FONT-SIZE: 10t
}

.td3
{
    TEXT-ALIGN: left;
    FONT-FAMILY: Verdana, Tahoma, Arial;
    height:36px;
    margin-top:5px;
    COLOR: black;
    FONT-SIZE: 10pt
}
    </style>


       <body leftmargin="0" rightmargin="0" topmargin="0">
       <!--  <table width="100%">
            <tr>
              <TD >
                <div align="center">
                  <IMG src="ignou8.png">
                </div>
              </TD>
            </tr>
          </table>
          <p>&nbsp;</p>
          -->

    <script language="javaScript" src="Include/date_picker_New.js" type="text/javascript"></script>

    <script language="javaScript" src="Include/ufv.js" type="text/javascript"></script>
    
    <script language=javascript>
      
          function Validate(frm) {
            //for name
            //for EmailID	

              if (document.forms[0].EnrNo.value != '' || document.forms[0].EnrNo.value.length == '10' || document.forms[0].EnrNo.value.length == '9') {

              }
              else {
                  alert('Please Enter Enrollment No.');
                  document.forms[0].EnrNo.focus();
                  return false;
              }

            if (document.forms[0].Program.value == '') {
                //alert("Program should not be blank...")
               // document.forms[0].Program.focus();
                //return false;
            }


        } //validate

     
    </script>
    
    <div align=center>
    <table width=95%>
    <tr class=td2 style="text-align:center">
    <td width=10%><img src=images/logo.png height=30 width=60 /></td>
    <td><b>Indira Gandhi National Open University</b></font></td>
    </tr>
    </table>
     <table width=95%>
     <tr class=td2><td>
    <div align="center"><hr />
<b>MPDD:  Material Dispatch Status (Jan-2025 Session) </b><br />
        </font> 
        <p>&nbsp;</p>

        <form name="frm" method="post" action="https://gradecard.ignou.ac.in/mpddstatus/Jan25/StudentMaterialStatus.aspx" id="frm">
<div>
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="EyEfLXn06wPpq/orsp7Dvk6j3c1qvI3WtS0BDg/WvdguFTXdFdznSK8W4m2x8xwUnkDt96zNNg4bJMuaVcs10V/fj+t1uzo76F0xbw37xgx5LVgXKHSNAiFuQqSvJMdfn7jb/bRfz5T173BHw2RQNS2exUkaki8TMSAgfC4L2dz+03D/" />
</div>

<div>

	<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="37E461F3" />
	<input type="hidden" name="__VIEWSTATEENCRYPTED" id="__VIEWSTATEENCRYPTED" value="" />
	<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="hoS1J0idbOWe099mhqivvG9aivNHcbuG+X4Oq3o+Qm3LQAZ6WGSUVf1yRp2ZUWh/lP76j66xg3Z4kE9a4WKnh1+WiSHkXN93JvvjccjoHzS18NG/hB/Lz0Q7SHwOiYS2/7DuHAjC6ZP7cY3u71lcKjLi4Ck=" />
</div>
        <div align=center><i>Enter following fields to view Status</i></div><br />
        <table width=40%>
       
        <td width=90%>
       
            <table width="100%" cellpadding="5" cellspacing="0" class="bkCTable2">
               
                <tr class="td2">
                    <td width=30%>
                        Enrollment No.<font color="#FF0000">*</font></td>
                    <td width=70%>
                        <input name="EnrNo" type="text" id="EnrNo" size="10" maxlength="10" class="form-control" /></td>
                </tr>
                
                <!-- <tr class="td2">
                    <td>
                        Program<font color="#FF0000">*</font></td>
                    <td style="width: 74px">

                     <select name="Program" id="Program" class="form-control">
	<option value="">--Select--</option>

</select>
                        
                        </td>
                </tr>
                -->
                            
                <tr class="td">
                    <td colspan="2">
                        <div align="center">
                            <input type="submit" name="SubmitStage1" class="btn btn-primary" value="Submit" onclick="return Validate(this);" id="SubmitStage1" />
                            </div>
                    </td>
                </tr>
            </table>
       </td></tr>
</table> <script language="javascript" type="text/javascript">
             document.forms[0].EnrNo.focus();
    </script>
            
            <font class=c2font></font>
        </form>
        <br />
        <font class="cfont"><i>Fields marked with <font color="#FF0000">*</font> are mandatory</i></font>
        <br /><br />
      <font class=c2font><span id="lblmessage"></span></font>
        
    </div>

   

<div align=left><a class=hcatlist href="javascript:history.back()" >Back</a> 

</body>

<!-- Mirrored from gradecard.ignou.ac.in/mpddstatus/Jan25/StudentMaterialStatus.aspx by HTTrack Website Copier/3.x [XR&CO'2014], Thu, 08 Oct 2026 09:19:46 GMT -->
</html>
